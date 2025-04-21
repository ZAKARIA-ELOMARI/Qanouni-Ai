require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const chatRoutes = require('./chatRoutes');
const { body, validationResult } = require('express-validator'); // Add express-validator

// Validate essential environment variables
if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not set in environment variables');
    process.exit(1);
}

if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set in environment variables');
    process.exit(1);
}

// Test database connection
(async () => {
    try {
        await db.query('SELECT 1');
        console.log('Database connected successfully');
    } catch (error) {
        console.error('Error connecting to the database:', error.message);
        process.exit(1); // Exit the application if the database connection fails
    }
})();

const app = express();
app.use(express.json());

// Enable CORS for front-end integration
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); // Allow all origins for testing purposes
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200); // Respond to preflight request
    }
    next();
});

// Register endpoint
app.post(
    '/api/register',
    [
        body('username').notEmpty().withMessage('Username is required'),
        body('email').isEmail().withMessage('Invalid email format'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        try {
            const { username, email, password } = req.body;

            // Check if email already exists
            const { rows: existingUsers } = await db.query(
                'SELECT * FROM users WHERE email = $1',
                [email]
            );

            if (existingUsers.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already in use',
                });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert user into database
            await db.query(
                'INSERT INTO users (username, email, password) VALUES ($1, $2, $3)',
                [username, email, hashedPassword]
            );

            res.status(201).json({
                success: true,
                message: 'User registered successfully',
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                success: false,
                message: 'Error registering user',
            });
        }
    }
);

// Login endpoint
app.post(
    '/api/login',
    [
        body('email').isEmail().withMessage('Invalid email format'),
        body('password').notEmpty().withMessage('Password is required'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        try {
            const { email, password } = req.body;

            // Find user
            const { rows: users } = await db.query(
                'SELECT * FROM users WHERE email = $1',
                [email]
            );

            if (users.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials',
                });
            }

            const user = users[0];

            // Check password
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials',
                });
            }

            // Generate JWT token
            const token = jwt.sign(
                { userId: user.id },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({
                success: true,
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                },
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                success: false,
                message: 'Error logging in',
            });
        }
    }
);

// Use chat routes
app.use('/api', chatRoutes);

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});