import express from 'express';
import validator from '../utils/validator.js';
import { sendEmail, emailTemplates } from '../utils/emailService.js';

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


    // Forgot Password
    router.post('/forgot-password', async (req, res) => {
        try {
            const { email } = req.body;
            if (!email) return res.status(400).json({ error: 'Email is required' });

            // Generate token
            const { data, error } = await req.db.createPasswordResetToken(email);

            if (error) {
                // Return 200 even on error to prevent enumeration (if logic dictates)
                // But for now we trust createPasswordResetToken to return safe success
                return res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });
            }

            if (data && data.token) {
                // Send email
                const resetLink = `${req.protocol}://${req.get('host')}/?reset_token=${data.token}`;
                const emailHtml = emailTemplates.passwordReset(resetLink);

                await sendEmail(email, 'Password Reset Request', emailHtml);
            }

            res.json({ message: 'If that email exists, a reset link has been sent.' });

        } catch (error) {
            console.error('Forgot password route error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Reset Password
    router.post('/reset-password', async (req, res) => {
        try {
            const { token, newPassword } = req.body;
            if (!token || !newPassword) {
                return res.status(400).json({ error: 'Token and new password are required' });
            }

            const { data, error } = await req.db.resetPasswordWithToken(token, newPassword);

            if (error) {
                return res.status(400).json({ error });
            }

            res.json({ message: 'Password reset successful. You can now login.' });

        } catch (error) {
            console.error('Reset password route error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    return router;
}
