# Chatbot Application

This is a chatbot application built with Node.js, Express, MySQL, and OpenAI's API. It supports user authentication, conversation management, and AI-powered responses.

## Features
- User registration and login with JWT-based authentication.
- Conversation management (create, fetch, delete).
- AI-powered responses using OpenAI's GPT-4 model.
- File assistant integration for advanced queries.

## Prerequisites
- Node.js (v16 or higher)
- MySQL server
- OpenAI API key

## Setup Instructions
1. Clone the repository:
   ```bash
   git clone https://github.com/Hamza-Elbk/chatbot-API
   cd chatbot-API
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   - Rename `.env.example` to `.env` .
   - Update the `.env` file with your database credentials, OpenAI API key, and other configurations.

4. Set up the database:
   ```bash
   npm run setup-db
   ```

5. Start the server:
   - For production:
     ```bash
     npm start
     ```
   - For development (with hot-reloading):
     ```bash
     npm run dev
     ```



## API Endpoints
### Authentication
- `POST /api/register` - Register a new user.
- `POST /api/login` - Login and get a JWT token.

### Conversations
- `POST /api/conversations` - Create a new conversation.
- `GET /api/conversations` - Get all conversations for the logged-in user.
- `GET /api/conversations/:id` - Get a specific conversation with messages.
- `POST /api/conversations/:id/messages` - Send a message and get an AI response.
- `DELETE /api/conversations/:id` - Delete a conversation.

### File Upload & File-Assisted Messaging (NEW)
- `POST /api/files/upload` - Upload PDF files and create a temporary vector store session.
- `POST /api/files/ask` - Send a message to the AI assistant with access to uploaded files.
- `GET /api/files/session` - Get information about the current file session.
- `DELETE /api/files/session` - Clean up file session and remove all uploaded files.

### User Profile
- `GET /api/profile` - Get user profile information.
- `PUT /api/profile` - Update user profile (username, email, password).

For detailed information about the file upload and file-assisted messaging endpoints, see [FILE_UPLOAD_API.md](./FILE_UPLOAD_API.md).

## License
This project is licensed under the ISC License.
