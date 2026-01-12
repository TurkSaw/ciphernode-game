import express from 'express';

export default function adminRoutes(authenticateToken) {
    const router = express.Router();

    // Admin Middleware
    const requireAdmin = (req, res, next) => {
        // req.user is populated by authenticateToken
        if (!req.user || req.user.isAdmin !== true) {
            console.warn(`Unauthorized admin access attempt by user: ${req.user ? req.user.username : 'unknown'}`);
            return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
        }
        next();
    };

    // Apply authentication and admin check to all routes in this router
    router.use(authenticateToken);
    router.use(requireAdmin);

    // GET /admin/stats - System Overview
    router.get('/stats', async (req, res) => {
        const stats = await req.db.getSystemStats();
        if (stats.error) {
            return res.status(500).json({ error: stats.error });
        }
        res.json(stats.data);
    });

    // GET /admin/users - User Management (Paginated)
    router.get('/users', async (req, res) => {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';

        const result = await req.db.getAllUsers(page, limit, search);
        if (result.error) {
            return res.status(500).json({ error: result.error });
        }
        res.json(result.data);
    });

    // POST /admin/users/:id/ban - Ban User
    router.post('/users/:id/ban', async (req, res) => {
        const userId = req.params.id;
        // Prevent banning yourself
        if (userId === req.user.userId) {
            return res.status(400).json({ error: 'You cannot ban yourself.' });
        }

        const result = await req.db.toggleBanUser(userId, true);
        if (result.error) {
            return res.status(500).json({ error: result.error });
        }

        // Optional: Disconnect socket if online (could emit event via req.io if available)

        res.json({ message: 'User banned successfully' });
    });

    router.post('/users/:id/unban', async (req, res) => {
        const userId = req.params.id;
        const result = await req.db.toggleBanUser(userId, false);
        if (result.error) {
            return res.status(500).json({ error: result.error });
        }
        res.json({ message: 'User unbanned successfully' });
    });

    // DELETE /admin/users/:id - Delete User
    router.delete('/users/:id', async (req, res) => {
        const userId = req.params.id;
        // Prevent deleting yourself
        if (userId === req.user.userId) {
            return res.status(400).json({ error: 'You cannot delete yourself.' });
        }

        const result = await req.db.deleteUser(userId);
        if (result.error) {
            return res.status(500).json({ error: result.error });
        }
        res.json({ message: 'User deleted successfully' });
    });

    // POST /admin/users/:id/role - Update User Role (Superadmin Only)
    router.post('/users/:id/role', async (req, res) => {
        // Double check superadmin status (extra layer)
        if (req.user.role !== 'superadmin') {
            return res.status(403).json({ error: 'Only Superadmin can change roles.' });
        }

        const userId = req.params.id;
        const { role } = req.body;

        // Prevent changing your own role
        if (userId === req.user.userId) {
            return res.status(400).json({ error: 'You cannot change your own role.' });
        }

        const result = await req.db.updateUserRole(userId, role);
        if (result.error) {
            return res.status(500).json({ error: result.error });
        }
        res.json({ message: `User role updated to ${role}` });
    });

    // POST /admin/chat/clear - Clear Chat
    router.post('/chat/clear', async (req, res) => {
        const result = await req.db.clearChatMessages();
        if (result.error) {
            return res.status(500).json({ error: result.error });
        }

        // Emit event to all connected clients to clear their UI
        if (req.io) {
            req.io.emit('chat cleared');
        }

        res.json({ message: 'Chat history cleared' });
    });

    return router;
}
