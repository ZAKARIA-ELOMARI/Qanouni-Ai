const express = require('express');
const router = express.Router();
const db = require('./db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const OpenAI = require('openai');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // Preserve file extension when saving to disk
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + Date.now() + ext);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Setup OpenAI configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Vector Store ID for file search (master law corpus)
const MASTER_STORE_ID = process.env.VECTOR_STORE_ID || "vs_67f58b921f5c8191b7d30a1953f44f91";

// Keep track of assistant and thread IDs for each user
const userAssistants = {};

// Create file assistant for a user if it doesn't exist (basic version with master store only)
async function getOrCreateFileAssistant(userId) {
  if (!userAssistants[userId]) {
    try {
      // Create an Assistant that uses the file_search tool with master store
      const assistant = await openai.beta.assistants.create({
        name: "File Query Assistant",
        instructions: "Réponds aux questions en te basant sur le contenu du fichier enregistré. À la fin, spécifie le numéro du titre de loi ainsi que le numéro de l'article.",
        tools: [{"type": "file_search"}],
        tool_resources: {
          file_search: {
            vector_store_ids: [MASTER_STORE_ID]
          }
        },
        model: "gpt-4o-mini"
      });
      
      // Create a thread for this user
      const thread = await openai.beta.threads.create();
      
      userAssistants[userId] = {
        assistantId: assistant.id,
        threadId: thread.id,
        userVectorStoreId: MASTER_STORE_ID,
        isMasterStore: true
      };
      
      console.log(`Created basic file assistant for user ${userId} with master store: ${MASTER_STORE_ID}`);
    } catch (error) {
      console.error('Error creating basic file assistant:', error);
      throw error;
    }
  }
  
  return userAssistants[userId];
}

// Create or get user's permanent vector store
async function getOrCreateUserVectorStore(userId, username) {
  try {
    // Check if user already has a vector store
    const userResult = await db.query('SELECT vector_store_id FROM users WHERE id = $1', [userId]);
    
    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }
    
    let vectorStoreId = userResult.rows[0].vector_store_id;
    
    // If user doesn't have a vector store, create one
    if (!vectorStoreId) {
      const userStore = await openai.vectorStores.create({
        name: `${username}_permanent_files`,
        // No expiration - permanent storage
      });
      
      vectorStoreId = userStore.id;
        // Copy master corpus files to user's vector store
      try {
        // Get files from master store
        const masterFiles = await openai.vectorStores.files.list(MASTER_STORE_ID);
        console.log(`Found ${masterFiles.data.length} files in master store to copy to user ${username}`);
        
        // Add master files to user's vector store (this creates references, not duplicates)
        if (masterFiles.data.length > 0) {
          const fileIds = masterFiles.data.map(f => f.id);
          
          // Verify files exist before trying to add them
          const validFileIds = [];
          for (const fileId of fileIds) {
            try {
              await openai.files.retrieve(fileId);
              validFileIds.push(fileId);
            } catch (fileError) {
              console.warn(`File ${fileId} no longer exists, skipping...`);
            }
          }
          
          if (validFileIds.length > 0) {
            await openai.vectorStores.fileBatches.createAndPoll(vectorStoreId, {
              file_ids: validFileIds
            });
            console.log(`Added ${validFileIds.length} valid master files to user ${username}'s vector store`);
          } else {
            console.warn(`No valid master files found to copy to user ${username}'s vector store`);
          }
        }
      } catch (copyError) {
        console.error('Error copying master files to user store:', copyError);
        // Continue anyway - user can still upload their own files
      }
      
      // Save vector store ID to database
      await db.query(
        'UPDATE users SET vector_store_id = $1 WHERE id = $2',
        [vectorStoreId, userId]
      );
      
      console.log(`Created permanent vector store for user ${username}:`, vectorStoreId);
    }
    
    return vectorStoreId;
  } catch (error) {
    console.error('Error creating/getting user vector store:', error);
    throw error;
  }
}

// Create file assistant that uses user's vector store (contains both master and user files)
async function getOrCreateFileAssistant(userId, username) {
  if (!userAssistants[userId]) {
    try {
      // Get user's vector store
      const userVectorStoreId = await getOrCreateUserVectorStore(userId, username);
      
      // Create an Assistant that uses the user's vector store
      const assistant = await openai.beta.assistants.create({
        name: `File-Assistant-${username}`,
        instructions: (
          "You are a legal assistant that can access both the master Moroccan law corpus and the user's uploaded documents. " +
          "When answering questions, prioritize information from the user's documents when relevant, " +
          "but also consult the master law corpus for comprehensive legal context. " +
          "Always cite your sources and specify whether information comes from user documents or the law corpus. " +
          "Respond in French and provide article numbers and law titles when applicable."
        ),
        tools: [{"type": "file_search"}],
        tool_resources: {
          file_search: {
            vector_store_ids: [userVectorStoreId] // Only user store
          }
        },
        model: "gpt-4o-mini"
      });
      
      // Create a thread for this user
      const thread = await openai.beta.threads.create();
      
      userAssistants[userId] = {
        assistantId: assistant.id,
        threadId: thread.id,
        userVectorStoreId: userVectorStoreId
      };
      
      console.log(`Created file assistant for user ${username} with user vector store: ${userVectorStoreId}`);
    } catch (error) {
      // Handle "vector store not found" error by falling back to master store
      if (error.status === 404 && error.type === 'invalid_request_error' && 
          error.message && error.message.includes('Vector store') && error.message.includes('not found')) {
        console.warn(`User ${username} vector store not found, falling back to master store: ${MASTER_STORE_ID}`);
        
        // Create an Assistant that uses the master store instead
        const assistant = await openai.beta.assistants.create({
          name: `File-Assistant-${username}-Fallback`,
          instructions: (
            "You are a legal assistant specializing in Moroccan law. " +
            "Provide comprehensive answers based on the legal corpus. " +
            "Always cite your sources, including article numbers and law titles when applicable. " +
            "Respond in French and be precise in your legal explanations."
          ),
          tools: [{"type": "file_search"}],
          tool_resources: {
            file_search: {
              vector_store_ids: [MASTER_STORE_ID] // Fall back to master store
            }
          },
          model: "gpt-4o-mini"
        });
        
        // Create a thread for this user
        const thread = await openai.beta.threads.create();
        
        userAssistants[userId] = {
          assistantId: assistant.id,
          threadId: thread.id,
          userVectorStoreId: MASTER_STORE_ID,
          isFallback: true // Flag to indicate this is a fallback using master store
        };
        
        console.log(`Created fallback file assistant for user ${username} with master store: ${MASTER_STORE_ID}`);
        
        // Try to reset user's vector store ID in database
        try {
          await db.query(
            'UPDATE users SET vector_store_id = NULL WHERE id = $1',
            [userId]
          );
          console.log(`Reset invalid vector store ID for user ${username}`);
        } catch (dbError) {
          console.error('Failed to reset user vector store ID:', dbError);
        }
      } else {
        // Re-throw if it's not a vector store not found error
        throw error;
      }
    }
  }
  
  return userAssistants[userId];
}

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ success: false, message: 'Access denied' });
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Retry logic for OpenAI API calls
async function retryOpenAICall(apiCall, retries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      console.error(`OpenAI API call failed (attempt ${attempt}):`, error);
      if (attempt === retries) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Create a new conversation
router.post('/conversations', authenticateToken, async (req, res) => {
  try {
    const { title = 'New Conversation' } = req.body;
    const userId = req.user.userId;

    try {
      const result = await db.query(
        'INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING id, created_at',
        [userId, title]
      );

      res.status(201).json({
        success: true,
        conversation: {
          id: result.rows[0].id,
          title,
          created_at: result.rows[0].created_at
        }
      });
    } catch (dbError) {
      console.error('Database error creating conversation:', dbError);
      throw new Error('Database error');
    }
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating conversation'
    });
  }
});

// Get all conversations for a user
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    try {
      const result = await db.query(
        'SELECT id, title, created_at, updated_at FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC',
        [userId]
      );

      res.json({
        success: true,
        conversations: result.rows
      });
    } catch (dbError) {
      console.error('Database error fetching conversations:', dbError);
      throw new Error('Database error');
    }
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching conversations'
    });
  }
});

// Export conversation history - Must be before /:id route to avoid conflicts
router.get('/conversations/export', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { format = 'json' } = req.query; // Support 'json' or 'csv'

    // Get user info
    const userResult = await db.query('SELECT username FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    const username = userResult.rows[0].username;

    // Get all conversations with messages
    const conversationsResult = await db.query(`
      SELECT 
        c.id as conversation_id,
        c.title,
        c.created_at as conversation_created_at,
        c.updated_at as conversation_updated_at,
        m.id as message_id,
        m.content,
        m.is_bot,
        m.created_at as message_created_at
      FROM conversations c
      LEFT JOIN messages m ON c.id = m.conversation_id
      WHERE c.user_id = $1
      ORDER BY c.created_at DESC, m.created_at ASC
    `, [userId]);

    if (conversationsResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No conversations found'
      });
    }

    // Group messages by conversation
    const conversationsMap = new Map();
    conversationsResult.rows.forEach(row => {
      const convId = row.conversation_id;
      
      if (!conversationsMap.has(convId)) {
        conversationsMap.set(convId, {
          id: convId,
          title: row.title,
          created_at: row.conversation_created_at,
          updated_at: row.conversation_updated_at,
          messages: []
        });
      }
      
      if (row.message_id) {
        conversationsMap.get(convId).messages.push({
          id: row.message_id,
          content: row.content,
          is_bot: row.is_bot,
          role: row.is_bot ? 'assistant' : 'user',
          created_at: row.message_created_at
        });
      }
    });

    const conversations = Array.from(conversationsMap.values());
    const exportData = {
      username: username,
      exported_at: new Date().toISOString(),
      total_conversations: conversations.length,
      total_messages: conversations.reduce((sum, conv) => sum + conv.messages.length, 0),
      conversations: conversations
    };

    if (format.toLowerCase() === 'csv') {
      // Generate CSV format
      let csvContent = 'Conversation ID,Conversation Title,Conversation Created,Message ID,Message Role,Message Content,Message Created\n';
      
      conversations.forEach(conv => {
        if (conv.messages.length === 0) {
          // Empty conversation
          csvContent += `"${conv.id}","${conv.title.replace(/"/g, '""')}","${conv.created_at}","","","",""\n`;
        } else {
          conv.messages.forEach(msg => {
            const escapedContent = msg.content.replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, '');
            csvContent += `"${conv.id}","${conv.title.replace(/"/g, '""')}","${conv.created_at}","${msg.id}","${msg.role}","${escapedContent}","${msg.created_at}"\n`;
          });
        }
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${username}_conversations_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } else {
      // Default JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${username}_conversations_${new Date().toISOString().split('T')[0]}.json"`);
      res.json(exportData);
    }
  } catch (error) {
    console.error('Error exporting conversation history:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting conversation history'
    });
  }
});

// Export specific conversation by ID - Must be before /:id route to avoid conflicts
router.get('/conversations/:id/export', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const conversationId = req.params.id;
    const { format = 'json' } = req.query; // Support 'json' or 'csv'

    // Get user info
    const userResult = await db.query('SELECT username FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    const username = userResult.rows[0].username;

    // Get specific conversation with messages
    const conversationResult = await db.query(`
      SELECT 
        c.id as conversation_id,
        c.title,
        c.created_at as conversation_created_at,
        c.updated_at as conversation_updated_at,
        m.id as message_id,
        m.content,
        m.is_bot,
        m.created_at as message_created_at
      FROM conversations c
      LEFT JOIN messages m ON c.id = m.conversation_id
      WHERE c.id = $1 AND c.user_id = $2
      ORDER BY m.created_at ASC
    `, [conversationId, userId]);

    if (conversationResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Build conversation object with messages
    const firstRow = conversationResult.rows[0];
    const conversation = {
      id: firstRow.conversation_id,
      title: firstRow.title,
      created_at: firstRow.conversation_created_at,
      updated_at: firstRow.conversation_updated_at,
      messages: []
    };

    // Add messages if they exist
    conversationResult.rows.forEach(row => {
      if (row.message_id) {
        conversation.messages.push({
          id: row.message_id,
          content: row.content,
          is_bot: row.is_bot,
          role: row.is_bot ? 'assistant' : 'user',
          created_at: row.message_created_at
        });
      }
    });

    const exportData = {
      username: username,
      exported_at: new Date().toISOString(),
      conversation: conversation,
      total_messages: conversation.messages.length
    };

  
    if (format.toLowerCase() === 'csv') {
      // Generate CSV format
      let csvContent = 'Conversation ID,Conversation Title,Conversation Created,Message ID,Message Role,Message Content,Message Created\n';
      
      if (conversation.messages.length === 0) {
        // Empty conversation
        csvContent += `"${conversation.id}","${conversation.title.replace(/"/g, '""')}","${conversation.created_at}","","","",""\n`;
      } else {
        conversation.messages.forEach(msg => {
          const escapedContent = msg.content.replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, '');
          csvContent += `"${conversation.id}","${conversation.title.replace(/"/g, '""')}","${conversation.created_at}","${msg.id}","${msg.role}","${escapedContent}","${msg.created_at}"\n`;
        });
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${username}_conversation_${conversationId}_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } else {
      // Default JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${username}_conversation_${conversationId}_${new Date().toISOString().split('T')[0]}.json"`);
      res.json(exportData);
    }

  } catch (error) {
    console.error('Error exporting specific conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting conversation'
    });
  }
});

// Get a specific conversation with messages
router.get('/conversations/:id', authenticateToken, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const userId = req.user.userId;

    try {
      const result = await db.query(
        'SELECT * FROM conversations WHERE id = $1 AND user_id = $2',
        [conversationId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }

      const messagesResult = await db.query(
        'SELECT id, content, is_bot, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
        [conversationId]
      );

      res.json({
        success: true,
        conversation: result.rows[0],
        messages: messagesResult.rows
      });
    } catch (dbError) {
      console.error('Database error fetching conversation or messages:', dbError);
      throw new Error('Database error');
    }
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching conversation'
    });
  }
});

// Send a message and get AI response
router.post('/conversations/:id/messages', authenticateToken, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const userId = req.user.userId;
    const { message, useFileAssistant = false } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }

    try {
      const result = await db.query(
        'SELECT * FROM conversations WHERE id = $1 AND user_id = $2',
        [conversationId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }

      await db.query(
        'INSERT INTO messages (conversation_id, content, is_bot) VALUES ($1, $2, $3)',
        [conversationId, message, false]
      );

      let aiResponse;      if (useFileAssistant) {
        try {
          // Get user info to pass to getOrCreateFileAssistant
          const userResult = await db.query('SELECT username FROM users WHERE id = $1', [userId]);
          if (userResult.rows.length === 0) {
            throw new Error('User not found');
          }
          const username = userResult.rows[0].username;
          
          // Get or create file assistant with proper error handling
          const assistantSession = await getOrCreateFileAssistant(userId, username);
          const { assistantId, threadId } = assistantSession;

          await retryOpenAICall(() =>
            openai.beta.threads.messages.create(threadId, {
              role: "user",
              content: message
            })
          );

          const run = await retryOpenAICall(() =>
            openai.beta.threads.runs.create(threadId, {
              assistant_id: assistantId
            })
          );

          let runStatus;
          do {
            await new Promise(resolve => setTimeout(resolve, 1000));
            runStatus = await retryOpenAICall(() =>
              openai.beta.threads.runs.retrieve(threadId, run.id)
            );
          } while (runStatus.status !== 'completed' && runStatus.status !== 'failed');

          if (runStatus.status === 'failed') {
            throw new Error('Assistant run failed');
          }

          const messages = await retryOpenAICall(() =>
            openai.beta.threads.messages.list(threadId)
          );

          const assistantMessages = messages.data.filter(msg => msg.role === 'assistant');
          aiResponse = assistantMessages.length > 0
            ? assistantMessages[0].content[0].text.value
            : "No response from the file assistant.";
          
          // Add a note if we're using the fallback assistant
          if (assistantSession.isFallback) {
            aiResponse = "Note: Using standard law corpus (your documents were not found).\n\n" + aiResponse;
          }
        } catch (error) {
          console.error('Error using file assistant:', error);
          
          // More helpful error message
          if (error.status === 404 && error.type === 'invalid_request_error' && 
              error.message && error.message.includes('Vector store')) {
            aiResponse = "Votre bibliothèque de documents est inaccessible. Veuillez réessayer ou télécharger à nouveau vos documents.";
          } else {
            aiResponse = "There was an error processing your request with the file assistant. Please try again later.";
          }
        }
      } else {
        const previousMessages = await db.query(
          'SELECT content, is_bot FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT 10',
          [conversationId]
        );

        const chatHistory = previousMessages.rows.map(msg => ({
          role: msg.is_bot ? 'assistant' : 'user',
          content: msg.content
        }));

        chatHistory.push({ role: 'user', content: message });

        const completion = await retryOpenAICall(() =>
          openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: chatHistory,
          })
        );

        aiResponse = completion.choices[0].message.content;
      }

      const saveResult = await db.query(
        'INSERT INTO messages (conversation_id, content, is_bot) VALUES ($1, $2, $3) RETURNING id, created_at',
        [conversationId, aiResponse, true]
      );

      await db.query(
        'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [conversationId]
      );

      res.json({
        success: true,
        message: {
          id: saveResult.rows[0].id,
          content: aiResponse,
          is_bot: true,
          created_at: saveResult.rows[0].created_at
        }
      });
    } catch (dbError) {
      console.error('Database error processing message:', dbError);
      throw new Error('Database error');
    }
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing message'
    });
  }
});

// Delete a conversation
router.delete('/conversations/:id', authenticateToken, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const userId = req.user.userId;

    try {
      const result = await db.query(
        'DELETE FROM conversations WHERE id = $1 AND user_id = $2 RETURNING id',
        [conversationId, userId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }

      res.json({
        success: true,
        message: 'Conversation deleted successfully'
      });
    } catch (dbError) {
      console.error('Database error deleting conversation:', dbError);
      throw new Error('Database error');
    }
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting conversation'
    });
  }
});

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    try {
      const result = await db.query(
        'SELECT id, username, email, created_at, request_count FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        profile: result.rows[0]
      });
    } catch (dbError) {
      console.error('Database error fetching user profile:', dbError);
      throw new Error('Database error');
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user profile'
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { username, email, password } = req.body;

    // Validate that at least one field is provided
    if (!username && !email && !password) {
      return res.status(400).json({
        success: false,
        message: 'At least one field (username, email, or password) must be provided'
      });
    }

    try {
      // Check if user exists
      const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const updates = [];
      const values = [];
      let valueIndex = 1;

      // Check for username conflicts
      if (username) {
        const usernameCheck = await db.query(
          'SELECT id FROM users WHERE username = $1 AND id != $2',
          [username, userId]
        );
        if (usernameCheck.rows.length > 0) {
          return res.status(409).json({
            success: false,
            message: 'Username already exists'
          });
        }
        updates.push(`username = $${valueIndex++}`);
        values.push(username);
      }

      // Check for email conflicts
      if (email) {
        const emailCheck = await db.query(
          'SELECT id FROM users WHERE email = $1 AND id != $2',
          [email, userId]
        );
        if (emailCheck.rows.length > 0) {
          return res.status(409).json({
            success: false,
            message: 'Email already exists'
          });
        }
        updates.push(`email = $${valueIndex++}`);
        values.push(email);
      }

      // Hash password if provided
      if (password) {
        if (password.length < 6) {
          return res.status(400).json({
            success: false,
            message: 'Password must be at least 6 characters long'
          });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        updates.push(`password = $${valueIndex++}`);
        values.push(hashedPassword);
      }

      // Add user ID for WHERE clause
      values.push(userId);

      // Execute update query
      const updateQuery = `
        UPDATE users 
        SET ${updates.join(', ')} 
        WHERE id = $${valueIndex}
        RETURNING id, username, email, created_at, request_count
      `;

      const result = await db.query(updateQuery, values);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        profile: result.rows[0]
      });
    } catch (dbError) {
      console.error('Database error updating user profile:', dbError);
      throw new Error('Database error');
    }
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user profile'
    });
  }
});

// Upload files and create file session endpoint
router.post('/files/upload', authenticateToken, upload.array('files', 5), async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user info
    const userResult = await db.query('SELECT username FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const username = userResult.rows[0].username;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    // Get or create user's permanent vector store
    const userVectorStoreId = await getOrCreateUserVectorStore(userId, username);
    
    // Upload PDF files to the user's permanent vector store
    const uploadedFiles = [];
    const openaiFiles = [];
    
    for (const file of req.files) {
      if (file.mimetype === 'application/pdf') {
        // Upload each file to OpenAI first
        const fileStream = fs.createReadStream(file.path);
        const openaiFile = await openai.files.create({
          file: fileStream,
          purpose: "assistants"
        });
        
        openaiFiles.push(openaiFile);
        uploadedFiles.push({
          originalName: file.originalname,
          path: file.path,
          size: file.size,
          openaiFileId: openaiFile.id
        });
      }
    }

    if (openaiFiles.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid PDF files found' });
    }

    // Upload and poll file batch to user's vector store using file IDs
    const fileBatch = await openai.vectorStores.fileBatches.createAndPoll(
      userVectorStoreId,
      {
        file_ids: openaiFiles.map(f => f.id)
      }
    );

    // Store file info in database
    for (const fileInfo of uploadedFiles) {
      await db.query(
        'INSERT INTO user_files (user_id, filename, original_name, openai_file_id, file_size) VALUES ($1, $2, $3, $4, $5)',
        [userId, fileInfo.path, fileInfo.originalName, fileInfo.openaiFileId, fileInfo.size]
      );
    }

    // Clean up temporary files from disk
    for (const file of req.files) {
      try {
        fs.unlinkSync(file.path);
      } catch (err) {
        console.error('Error deleting temp file:', err);
      }
    }

    res.json({
      success: true,
      message: 'Files uploaded successfully',
      vectorStoreId: userVectorStoreId,
      filesIndexed: fileBatch.file_counts,
      uploadedFiles: uploadedFiles.map(f => ({
        name: f.originalName,
        size: f.size
      }))
    });

  } catch (error) {
    console.error('Error uploading files:', error);
    
    // Clean up temporary files in case of error
    if (req.files) {
      for (const file of req.files) {
        try {
          fs.unlinkSync(file.path);
        } catch (err) {
          console.error('Error deleting temp file after error:', err);
        }
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Error uploading files'
    });
  }
});

// File-assisted messaging endpoint (using permanent vector stores)
router.post('/files/ask', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }

    // Get user info
    const userResult = await db.query('SELECT username, vector_store_id FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }    const { username, vector_store_id } = userResult.rows[0];
    
    // Check if user has any files (either vector store or uploaded files)
    let useMasterCorpusOnly = false;
    if (!vector_store_id) {
      const filesResult = await db.query('SELECT COUNT(*) as count FROM user_files WHERE user_id = $1', [userId]);
      if (filesResult.rows[0].count == 0) {
        // Instead of returning an error, we'll use the master corpus only
        useMasterCorpusOnly = true;
        console.log(`User ${username} has no files, will use master corpus only`);
      }
    }
      try {
      // Get or create file assistant 
      let assistantSession;
      if (useMasterCorpusOnly) {
        // Use the basic version that only uses master corpus
        assistantSession = await getOrCreateFileAssistant(userId);
      } else {
        // Use the enhanced version with both master corpus and user files
        assistantSession = await getOrCreateFileAssistant(userId, username);
      }
      
      // Add user message to thread
      await retryOpenAICall(() =>
        openai.beta.threads.messages.create(assistantSession.threadId, {
          role: "user",
          content: message
        })
      );

      // Create run
      const run = await retryOpenAICall(() =>
        openai.beta.threads.runs.create(assistantSession.threadId, {
          assistant_id: assistantSession.assistantId
        })
      );
      
      // Poll run status until completion
      let runStatus;
      do {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await retryOpenAICall(() =>
          openai.beta.threads.runs.retrieve(assistantSession.threadId, run.id)
        );
      } while (runStatus.status !== 'completed' && runStatus.status !== 'failed');

      if (runStatus.status === 'failed') {
        throw new Error('Assistant run failed');
      }

      // Get the latest assistant message
      const messages = await retryOpenAICall(() =>
        openai.beta.threads.messages.list(assistantSession.threadId, { limit: 1 })
      );

      const latestMessage = messages.data[0];
      const aiResponse = latestMessage && latestMessage.role === 'assistant'
        ? latestMessage.content[0].text.value
        : "No response from the file assistant.";      // Include information about whether this is using a fallback assistant
      const responseData = {
        success: true,
        response: aiResponse,
        vectorStoreId: assistantSession.userVectorStoreId
      };

      // Add notice about which corpus is being used
      if (assistantSession.isFallback) {
        responseData.usingFallback = true;
        responseData.fallbackNotice = "Using standard law corpus (documents not found)";
      } else if (useMasterCorpusOnly || assistantSession.isMasterStore) {
        responseData.usingMasterCorpusOnly = true;
        responseData.masterCorpusNotice = "Using standard law corpus (no user documents uploaded yet)";
      }

      res.json(responseData);

    } catch (error) {
      console.error('Error in file-assisted messaging:', error);
      
      // Provide a more specific error message for vector store issues
      if (error.status === 404 && error.message && error.message.includes('Vector store')) {
        res.status(500).json({
          success: false,
          message: 'Votre bibliothèque de documents est inaccessible. Veuillez réessayer ou télécharger à nouveau vos documents.',
          technicalDetails: 'Vector store not found - please recreate your document library'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Error processing your request with the file assistant'
        });
      }
    }

  } catch (error) {
    console.error('Error in file-assisted messaging:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing message'
    });
  }
});

// Get user files info (permanent storage)
router.get('/files/session', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user info including vector store
    const userResult = await db.query(
      'SELECT username, vector_store_id FROM users WHERE id = $1', 
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { username, vector_store_id } = userResult.rows[0];

    // Get user's uploaded files
    const filesResult = await db.query(
      'SELECT original_name, file_size, uploaded_at FROM user_files WHERE user_id = $1 ORDER BY uploaded_at DESC',
      [userId]
    );

    if (filesResult.rows.length === 0 && !vector_store_id) {
      return res.status(404).json({
        success: false,
        message: 'No files found'
      });
    }

    res.json({
      success: true,
      session: {
        vectorStoreId: vector_store_id,
        username: username,
        hasFiles: filesResult.rows.length > 0 || !!vector_store_id,
        uploadedFiles: filesResult.rows.map(f => ({
          name: f.original_name,
          size: f.file_size,
          uploadedAt: f.uploaded_at
        }))
      }
    });

  } catch (error) {
    console.error('Error getting files info:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving files information'
    });
  }
});

// Clear user files (permanent storage)
router.delete('/files/session', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user info including vector store
    const userResult = await db.query(
      'SELECT username, vector_store_id FROM users WHERE id = $1', 
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { username, vector_store_id } = userResult.rows[0];

    if (!vector_store_id) {
      return res.status(404).json({
        success: false,
        message: 'No files to clear'
      });
    }

    try {
      // Get user's files from database
      const filesResult = await db.query(
        'SELECT openai_file_id FROM user_files WHERE user_id = $1',
        [userId]
      );

      // Clean up OpenAI files and vector store
      if (vector_store_id) {
        // List files in vector store
        const refs = await openai.vectorStores.files.list(vector_store_id);
        console.log("Vector-store refs for user", username, ":", refs.data.map(r => r.id));

        // Remove files from vector store
        for (const ref of refs.data) {
          const fid = ref.id;
          // Detach the file from the vector-store (removes the embedding index)
          await openai.vectorStores.files.del(vector_store_id, fid);
          // Delete the underlying File object (frees storage & billing)
          await openai.files.del(fid);
        }

        // Delete the vector store itself
        await openai.vectorStores.del(vector_store_id);
      }

      // Clean up user's assistant if it exists
      if (userAssistants[userId]) {
        await openai.beta.assistants.del(userAssistants[userId].assistantId);
        delete userAssistants[userId];
      }

      // Remove files from database
      await db.query('DELETE FROM user_files WHERE user_id = $1', [userId]);
      
      // Clear vector store ID from user record
      await db.query('UPDATE users SET vector_store_id = NULL WHERE id = $1', [userId]);

      console.log("✔️ All files and vector store fully removed for user:", username);

      res.json({
        success: true,
        message: 'All files cleared successfully'
      });

    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
      
      // Still clean up database even if OpenAI cleanup fails
      await db.query('DELETE FROM user_files WHERE user_id = $1', [userId]);
      await db.query('UPDATE users SET vector_store_id = NULL WHERE id = $1', [userId]);
      
      if (userAssistants[userId]) {
        delete userAssistants[userId];
      }
      
      res.json({
        success: true,
        message: 'Files removed from database, but some OpenAI resources may not have been cleaned up'
      });
    }

  } catch (error) {
    console.error('Error clearing user files:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing files'
    });
  }
});

// Admin middleware to check if user is admin
const authenticateAdmin = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user exists and is admin
    const userResult = await db.query(
      'SELECT id, username, email, is_admin FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const user = userResult.rows[0];
    if (!user.is_admin) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    
    req.user = { ...decoded, ...user };
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid token' });
  }
};

// Admin route: Get all users with their conversation counts
router.get('/admin/users', authenticateAdmin, async (req, res) => {
  try {
    const usersResult = await db.query(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.created_at,
        u.request_count,
        u.vector_store_id,
        u.is_admin,
        COUNT(c.id) as conversation_count,
        COUNT(uf.id) as file_count,
        COALESCE(SUM(uf.file_size), 0) as total_file_size
      FROM users u
      LEFT JOIN conversations c ON u.id = c.user_id
      LEFT JOIN user_files uf ON u.id = uf.user_id
      GROUP BY u.id, u.username, u.email, u.created_at, u.request_count, u.vector_store_id, u.is_admin
      ORDER BY u.created_at DESC
    `);

    res.json({
      success: true,
      users: usersResult.rows.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.created_at,
        request_count: user.request_count,
        conversation_count: parseInt(user.conversation_count),
        file_count: parseInt(user.file_count),
        total_file_size: parseInt(user.total_file_size),
        has_vector_store: !!user.vector_store_id,
        is_admin: user.is_admin
      }))
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
});

// Admin route: Get detailed user information
router.get('/admin/users/:id', authenticateAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Get user basic info
    const userResult = await db.query(
      'SELECT id, username, email, created_at, request_count, vector_store_id, is_admin FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const user = userResult.rows[0];
    
    // Get user's conversations
    const conversationsResult = await db.query(
      'SELECT id, title, created_at, updated_at FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC',
      [userId]
    );
    
    // Get user's files
    const filesResult = await db.query(
      'SELECT original_name, file_size, uploaded_at FROM user_files WHERE user_id = $1 ORDER BY uploaded_at DESC',
      [userId]
    );
    
    // Get message count
    const messageCountResult = await db.query(
      'SELECT COUNT(*) as message_count FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.user_id = $1',
      [userId]
    );
    
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.created_at,
        request_count: user.request_count,
        is_admin: user.is_admin,
        has_vector_store: !!user.vector_store_id,
        conversation_count: conversationsResult.rows.length,
        message_count: parseInt(messageCountResult.rows[0].message_count),
        file_count: filesResult.rows.length,
        total_file_size: filesResult.rows.reduce((sum, file) => sum + parseInt(file.file_size), 0),
        conversations: conversationsResult.rows,
        files: filesResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user details'
    });
  }
});

// Admin route: Toggle user admin status
router.put('/admin/users/:id/admin', authenticateAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { is_admin } = req.body;
    
    if (typeof is_admin !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'is_admin must be a boolean value'
      });
    }
    
    // Prevent admin from removing their own admin status
    if (req.user.id == userId && !is_admin) {
      return res.status(400).json({
        success: false,
        message: 'You cannot remove your own admin privileges'
      });
    }
    
    const result = await db.query(
      'UPDATE users SET is_admin = $1 WHERE id = $2 RETURNING id, username, email, is_admin',
      [is_admin, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: `User ${is_admin ? 'granted' : 'revoked'} admin privileges`,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating user admin status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user admin status'
    });
  }
});

// Admin route: Delete user (and all their data)
router.delete('/admin/users/:id', authenticateAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Prevent admin from deleting themselves
    if (req.user.id == userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }
    
    // Get user info before deletion
    const userResult = await db.query(
      'SELECT username, vector_store_id FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const { username, vector_store_id } = userResult.rows[0];
    
    // Clean up OpenAI resources if user has them
    if (vector_store_id) {
      try {
        // Clean up user's assistant if it exists
        if (userAssistants[userId]) {
          await openai.beta.assistants.del(userAssistants[userId].assistantId);
          delete userAssistants[userId];
        }
        
        // Delete vector store and files
        const refs = await openai.vectorStores.files.list(vector_store_id);
        for (const ref of refs.data) {
          await openai.vectorStores.files.del(vector_store_id, ref.id);
          await openai.files.del(ref.id);
        }
        await openai.vectorStores.del(vector_store_id);
        
        console.log(`Cleaned up OpenAI resources for deleted user: ${username}`);
      } catch (cleanupError) {
        console.error('Error cleaning up OpenAI resources:', cleanupError);
      }
    }
    
    // Delete user (CASCADE will delete conversations, messages, and user_files)
    await db.query('DELETE FROM users WHERE id = $1', [userId]);
    
    res.json({
      success: true,
      message: `User ${username} and all associated data deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user'
    });
  }
});

// Admin route: Get system statistics
router.get('/admin/stats', authenticateAdmin, async (req, res) => {
  try {
    const statsResult = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE is_admin = true) as admin_users,
        (SELECT COUNT(*) FROM conversations) as total_conversations,
        (SELECT COUNT(*) FROM messages) as total_messages,
        (SELECT COUNT(*) FROM user_files) as total_files,
        (SELECT COALESCE(SUM(file_size), 0) FROM user_files) as total_file_size,
        (SELECT COUNT(*) FROM users WHERE vector_store_id IS NOT NULL) as users_with_files
    `);
    
    const recentUsersResult = await db.query(`
      SELECT COUNT(*) as recent_users 
      FROM users 
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    `);
    
    const activeUsersResult = await db.query(`
      SELECT COUNT(DISTINCT c.user_id) as active_users
      FROM conversations c
      WHERE c.updated_at >= CURRENT_DATE - INTERVAL '7 days'
    `);
    
    const stats = statsResult.rows[0];
    
    res.json({
      success: true,
      stats: {
        total_users: parseInt(stats.total_users),
        admin_users: parseInt(stats.admin_users),
        total_conversations: parseInt(stats.total_conversations),
        total_messages: parseInt(stats.total_messages),
        total_files: parseInt(stats.total_files),
        total_file_size: parseInt(stats.total_file_size),
        users_with_files: parseInt(stats.users_with_files),
        recent_users: parseInt(recentUsersResult.rows[0].recent_users),
        active_users: parseInt(activeUsersResult.rows[0].active_users)
      }
    });
  } catch (error) {
    console.error('Error fetching system stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching system statistics'
    });  }
});

// Admin route: Export all conversations (system-wide)
router.get('/admin/conversations/export', authenticateAdmin, async (req, res) => {
  try {
    const { format = 'json', user_id } = req.query; // Optional user_id filter

    let whereClause = '';
    let params = [];
    
    if (user_id) {
      whereClause = 'WHERE c.user_id = $1';
      params.push(user_id);
    }

    // Get all conversations with messages and user info
    const conversationsResult = await db.query(`
      SELECT 
        u.id as user_id,
        u.username,
        u.email,
        c.id as conversation_id,
        c.title,
        c.created_at as conversation_created_at,
        c.updated_at as conversation_updated_at,
        m.id as message_id,
        m.content,
        m.is_bot,
        m.created_at as message_created_at
      FROM users u
      JOIN conversations c ON u.id = c.user_id
      LEFT JOIN messages m ON c.id = m.conversation_id
      ${whereClause}
      ORDER BY u.username, c.created_at DESC, m.created_at ASC
    `, params);

    if (conversationsResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: user_id ? 'No conversations found for specified user' : 'No conversations found'
      });
    }

    // Group by user and conversation
    const usersMap = new Map();
    conversationsResult.rows.forEach(row => {
      const userId = row.user_id;
      const convId = row.conversation_id;
      
      if (!usersMap.has(userId)) {
        usersMap.set(userId, {
          user_id: userId,
          username: row.username,
          email: row.email,
          conversations: new Map()
        });
      }
      
      const user = usersMap.get(userId);
      if (!user.conversations.has(convId)) {
        user.conversations.set(convId, {
          id: convId,
          title: row.title,
          created_at: row.conversation_created_at,
          updated_at: row.conversation_updated_at,
          messages: []
        });
      }
      
      if (row.message_id) {
        user.conversations.get(convId).messages.push({
          id: row.message_id,
          content: row.content,
          is_bot: row.is_bot,
          role: row.is_bot ? 'assistant' : 'user',
          created_at: row.message_created_at
        });
      }
    });

    // Convert maps to arrays
    const users = Array.from(usersMap.values()).map(user => ({
      ...user,
      conversations: Array.from(user.conversations.values())
    }));

    const exportData = {
      exported_by: req.user.username,
      exported_at: new Date().toISOString(),
      total_users: users.length,
      total_conversations: users.reduce((sum, user) => sum + user.conversations.length, 0),
      total_messages: users.reduce((sum, user) => 
        sum + user.conversations.reduce((convSum, conv) => convSum + conv.messages.length, 0), 0
      ),
      users: users
    };

    if (format.toLowerCase() === 'csv') {
      // Generate CSV format
      let csvContent = 'User ID,Username,Email,Conversation ID,Conversation Title,Conversation Created,Message ID,Message Role,Message Content,Message Created\n';
      
      users.forEach(user => {
        user.conversations.forEach(conv => {
          if (conv.messages.length === 0) {
            // Empty conversation
            csvContent += `"${user.user_id}","${user.username}","${user.email}","${conv.id}","${conv.title.replace(/"/g, '""')}","${conv.created_at}","","","",""\n`;
          } else {
            conv.messages.forEach(msg => {
              const escapedContent = msg.content.replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, '');
              csvContent += `"${user.user_id}","${user.username}","${user.email}","${conv.id}","${conv.title.replace(/"/g, '""')}","${conv.created_at}","${msg.id}","${msg.role}","${escapedContent}","${msg.created_at}"\n`;
            });
          }
        });
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="all_conversations_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } else {
      // Default JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="all_conversations_${new Date().toISOString().split('T')[0]}.json"`);
      res.json(exportData);
    }

  } catch (error) {
    console.error('Error exporting admin conversation history:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting conversation history'
    });
  }
});

module.exports = router;