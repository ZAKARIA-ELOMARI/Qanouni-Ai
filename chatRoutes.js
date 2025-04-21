const express = require('express');
const router = express.Router();
const db = require('./db');
const jwt = require('jsonwebtoken');
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

// Create a new conversation
router.post('/conversations', authenticateToken, async (req, res) => {
  try {
    const { title = 'New Conversation' } = req.body;
    const userId = req.user.userId;
    
    const [result] = await db.query(
      'INSERT INTO conversations (user_id, title) VALUES (?, ?)',
      [userId, title]
    );
    
    res.status(201).json({
      success: true,
      conversation: {
        id: result.insertId,
        title,
        created_at: new Date()
      }
    });
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
    
    const [conversations] = await db.query(
      'SELECT id, title, created_at, updated_at FROM conversations WHERE user_id = ? ORDER BY updated_at DESC',
      [userId]
    );
    
    res.json({
      success: true,
      conversations
    });
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
    
    // First verify the conversation belongs to this user
    const [conversations] = await db.query(
      'SELECT * FROM conversations WHERE id = ? AND user_id = ?',
      [conversationId, userId]
    );
    
    if (conversations.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }
    
    // Get messages
    const [messages] = await db.query(
      'SELECT id, content, is_bot, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [conversationId]
    );
    
    res.json({
      success: true,
      conversation: conversations[0],
      messages
    });
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
    
    // Verify the conversation belongs to this user
    const [conversations] = await db.query(
      'SELECT * FROM conversations WHERE id = ? AND user_id = ?',
      [conversationId, userId]
    );
    
    if (conversations.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }
    
    // Save user message
    await db.query(
      'INSERT INTO messages (conversation_id, content, is_bot) VALUES (?, ?, ?)',
      [conversationId, message, false]
    );
    
    let aiResponse;
    
    if (useFileAssistant) {
      // Use the file assistant for this request
      try {
        // Get or create file assistant for this user
        const { assistantId, threadId } = await getOrCreateFileAssistant(userId);
        
        // Add user message to the thread
        await openai.beta.threads.messages.create(
          threadId,
          {
            role: "user",
            content: message
          }
        );
        
        // Run the assistant on the thread
        const run = await openai.beta.threads.runs.create(
          threadId,
          {
            assistant_id: assistantId
          }
        );
        
        // Poll for the run status until completion
        let runStatus;
        do {
          await new Promise(resolve => setTimeout(resolve, 1000));
          runStatus = await openai.beta.threads.runs.retrieve(
            threadId,
            run.id
          );
        } while (runStatus.status !== 'completed' && runStatus.status !== 'failed');
        
        if (runStatus.status === 'failed') {
          throw new Error('Assistant run failed');
        }
        
        // Retrieve the assistant's response
        const messages = await openai.beta.threads.messages.list(
          threadId
        );
        
        // Get the latest assistant message
        const assistantMessages = messages.data.filter(msg => msg.role === 'assistant');
        if (assistantMessages.length > 0) {
          // Get the text content from the most recent assistant message
          aiResponse = assistantMessages[0].content[0].text.value;
        } else {
          aiResponse = "No response from the file assistant.";
        }
      } catch (error) {
        console.error('Error using file assistant:', error);
        aiResponse = "There was an error processing your request with the file assistant.";
      }
    } else {
      // Use the standard chat API
      // Get conversation history for context
      const [previousMessages] = await db.query(
        'SELECT content, is_bot FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 10',
        [conversationId]
      );
      
      // Format messages for OpenAI API
      const chatHistory = previousMessages.map(msg => ({
        role: msg.is_bot ? 'assistant' : 'user',
        content: msg.content
      }));
      
      // Add current message
      chatHistory.push({ role: 'user', content: message });
      
      // Get response from OpenAI
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // or your preferred model
        messages: chatHistory,
      });
      
      aiResponse = completion.choices[0].message.content;
    }
    
    // Save AI response to database
    const [saveResult] = await db.query(
      'INSERT INTO messages (conversation_id, content, is_bot) VALUES (?, ?, ?)',
      [conversationId, aiResponse, true]
    );
    
    // Update conversation timestamp
    await db.query(
      'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [conversationId]
    );
    
    res.json({
      success: true,
      message: {
        id: saveResult.insertId,
        content: aiResponse,
        is_bot: true,
        created_at: new Date()
      }
    });
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
    
    // Verify the conversation belongs to this user
    const [result] = await db.query(
      'DELETE FROM conversations WHERE id = ? AND user_id = ?',
      [conversationId, userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Conversation deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting conversation'
    });
  }
});

module.exports = router;