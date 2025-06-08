const express = require('express');
const router = express.Router();
const db = require('./db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const OpenAI = require('openai');

// Setup OpenAI configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Vector Store ID for file search
const VECTOR_STORE_ID = process.env.VECTOR_STORE_ID || "vs_67f12107a7d8819183387bcc311fda83";

// Keep track of assistant and thread IDs for each user
const userAssistants = {};

// Create file assistant for a user if it doesn't exist
async function getOrCreateFileAssistant(userId) {
  if (!userAssistants[userId]) {
    // Create an Assistant that uses the file_search tool
    const assistant = await openai.beta.assistants.create({
      name: "File Query Assistant",
      instructions: "Réponds aux questions en te basant sur le contenu du fichier enregistré. À la fin, spécifie le numéro du titre de loi ainsi que le numéro de l'article.",
      tools: [{"type": "file_search"}],
      tool_resources: {
        file_search: {
          vector_store_ids: [VECTOR_STORE_ID]
        }
      },
      model: "gpt-4o-mini"
    });
    
    // Create a thread for this user
    const thread = await openai.beta.threads.create();
    
    userAssistants[userId] = {
      assistantId: assistant.id,
      threadId: thread.id
    };
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

      let aiResponse;

      if (useFileAssistant) {
        try {
          const { assistantId, threadId } = await getOrCreateFileAssistant(userId);

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
        } catch (error) {
          console.error('Error using file assistant:', error);
          aiResponse = "There was an error processing your request with the file assistant.";
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

module.exports = router;