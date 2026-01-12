import express from 'express';
import validator from '../utils/validator.js';

export default function authRoutes() {
    const router = express.Router();

    router.post('/register', async (req, res) => {
        try {
            const db = req.db;
            const { username, email, password } = req.body;

            // Input validation
            if (!username || !email || !password) {
                return res.status(400).json({ error: 'Username, email and password are required' });
            }

            // Sanitize inputs
            const cleanUsername = validator.sanitizeString(username, 30);
            const cleanEmail = validator.sanitizeString(email, 254).toLowerCase();

            // Validate username
            if (!validator.isValidUsername(cleanUsername)) {
                return res.status(400).json({
                    error: 'Username must be 3-30 characters, contain only letters, numbers, underscore, and dash, and cannot be a reserved word'
                });
            }

            // Validate email
            if (!validator.isEmail(cleanEmail)) {
                return res.status(400).json({ error: 'Invalid email format' });
            }

            // Validate password
            if (!validator.isPassword(password)) {
                return res.status(400).json({ error: 'Password must be 6-128 characters' });
            }

            // Check for common weak passwords
            const weakPasswords = ['password', '123456', 'password123', 'admin', 'qwerty'];
            if (weakPasswords.includes(password.toLowerCase())) {
                return res.status(400).json({ error: 'Password is too weak. Please choose a stronger password' });
            }

            const result = await db.registerUser(cleanUsername, cleanEmail, password);

            if (result.error) {
                return res.status(400).json({ error: result.error });
            }

            res.status(201).json({
                message: 'User registered successfully',
                user: result.data
            });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    router.post('/login', async (req, res) => {
        try {
            const db = req.db;
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password are required' });
            }

            // Sanitize and validate email
            const cleanEmail = validator.sanitizeString(email, 254).toLowerCase();
            if (!validator.isEmail(cleanEmail)) {
                return res.status(400).json({ error: 'Invalid email format' });
            }

            // Validate password length (don't reveal if it's too short for security)
            if (typeof password !== 'string' || password.length > 128) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            const result = await db.loginUser(cleanEmail, password);

            if (result.error) {
                return res.status(401).json({ error: result.error });
            }

            res.json({
                message: 'Login successful',
                token: result.data.token,
                user: result.data.user
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    return router;
}
