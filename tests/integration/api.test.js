// Integration Tests - API Endpoints
import { describe, it, assert, before, after } from '../setup.js';
import http from 'http';

// Mock Express app for testing
class MockApp {
    constructor() {
        this.routes = new Map();
        this.middlewares = [];
    }
    
    use(middleware) {
        this.middlewares.push(middleware);
    }
    
    post(path, handler) {
        this.routes.set(`POST:${path}`, handler);
    }
    
    get(path, handler) {
        this.routes.set(`GET:${path}`, handler);
    }
    
    async handle(method, path, body = null, headers = {}) {
        const key = `${method}:${path}`;
        const handler = this.routes.get(key);
        
        if (!handler) {
            return { status: 404, body: { error: 'Not found' } };
        }
        
        const req = {
            method,
            path,
            body,
            headers,
            ip: '127.0.0.1'
        };
        
        const res = {
            statusCode: 200,
            headers: {},
            body: null,
            json: function(data) { this.body = data; return this; },
            status: function(code) { this.statusCode = code; return this; }
        };
        
        try {
            await handler(req, res);
            return { status: res.statusCode, body: res.body };
        } catch (error) {
            return { status: 500, body: { error: error.message } };
        }
    }
}

// Mock database for testing
class MockDatabase {
    constructor() {
        this.users = new Map();
        this.sessions = [];
        this.chatMessages = [];
    }
    
    async registerUser(username, email, password) {
        if (this.users.has(username.toLowerCase())) {
            throw new Error('Username already exists');
        }
        
        const user = {
            id: `user_${Date.now()}`,
            username,
            email: email.toLowerCase(),
            password: 'hashed_' + password, // Mock hash
            score: 0,
            level: 1,
            energy: 100,
            created_at: new Date()
        };
        
        this.users.set(username.toLowerCase(), user);
        return user;
    }
    
    async loginUser(username, password) {
        const user = this.users.get(username.toLowerCase());
        if (!user || user.password !== 'hashed_' + password) {
            throw new Error('Invalid credentials');
        }
        return user;
    }
    
    async getUserByUsername(username) {
        return this.users.get(username.toLowerCase()) || null;
    }
    
    async updateUserScore(username, score) {
        const user = this.users.get(username.toLowerCase());
        if (user) {
            user.score = Math.max(user.score, score);
            return user;
        }
        return null;
    }
    
    async getLeaderboard(limit = 10) {
        return Array.from(this.users.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(user => ({
                username: user.username,
                score: user.score,
                level: user.level
            }));
    }
}

// Setup mock API routes
function setupMockAPI(app, db) {
    // Register endpoint
    app.post('/api/register', async (req, res) => {
        const { username, email, password } = req.body;
        
        // Basic validation
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        if (username.length < 3 || username.length > 30) {
            return res.status(400).json({ error: 'Username must be 3-30 characters' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        
        try {
            const user = await db.registerUser(username, email, password);
            res.json({ 
                success: true, 
                user: { 
                    username: user.username, 
                    email: user.email,
                    score: user.score 
                } 
            });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    // Login endpoint
    app.post('/api/login', async (req, res) => {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Missing credentials' });
        }
        
        try {
            const user = await db.loginUser(username, password);
            res.json({ 
                success: true, 
                token: 'mock_jwt_token',
                user: { 
                    username: user.username, 
                    score: user.score,
                    level: user.level 
                } 
            });
        } catch (error) {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    });
    
    // Score update endpoint
    app.post('/api/score', async (req, res) => {
        const { username, score, gameTime } = req.body;
        
        if (!username || score === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Anti-cheat validation
        if (score < 0 || score > 999999) {
            return res.status(400).json({ error: 'Invalid score' });
        }
        
        if (gameTime && gameTime > 0 && score > (gameTime * 10 + 100)) {
            return res.status(400).json({ error: 'Suspicious score detected' });
        }
        
        try {
            const user = await db.updateUserScore(username, score);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            res.json({ success: true, newScore: user.score });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    
    // Leaderboard endpoint
    app.get('/api/leaderboard', async (req, res) => {
        try {
            const leaderboard = await db.getLeaderboard();
            res.json({ success: true, leaderboard });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
}

describe('API Integration Tests', () => {
    let app, db;
    
    before(() => {
        app = new MockApp();
        db = new MockDatabase();
        setupMockAPI(app, db);
    });
    
    describe('User Registration', () => {
        it('should register a new user successfully', async () => {
            const response = await app.handle('POST', '/api/register', {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123'
            });
            
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.body.success, true);
            assert.strictEqual(response.body.user.username, 'testuser');
            assert.strictEqual(response.body.user.email, 'test@example.com');
        });
        
        it('should reject registration with missing fields', async () => {
            const response = await app.handle('POST', '/api/register', {
                username: 'testuser2'
                // Missing email and password
            });
            
            assert.strictEqual(response.status, 400);
            assert.strictEqual(response.body.error, 'Missing required fields');
        });
        
        it('should reject registration with short username', async () => {
            const response = await app.handle('POST', '/api/register', {
                username: 'ab',
                email: 'test2@example.com',
                password: 'password123'
            });
            
            assert.strictEqual(response.status, 400);
            assert.strictEqual(response.body.error, 'Username must be 3-30 characters');
        });
        
        it('should reject registration with short password', async () => {
            const response = await app.handle('POST', '/api/register', {
                username: 'testuser3',
                email: 'test3@example.com',
                password: '12345'
            });
            
            assert.strictEqual(response.status, 400);
            assert.strictEqual(response.body.error, 'Password must be at least 6 characters');
        });
        
        it('should reject duplicate username', async () => {
            // First registration
            await app.handle('POST', '/api/register', {
                username: 'duplicate',
                email: 'first@example.com',
                password: 'password123'
            });
            
            // Second registration with same username
            const response = await app.handle('POST', '/api/register', {
                username: 'duplicate',
                email: 'second@example.com',
                password: 'password456'
            });
            
            assert.strictEqual(response.status, 400);
            assert.strictEqual(response.body.error, 'Username already exists');
        });
    });
    
    describe('User Login', () => {
        before(async () => {
            // Register a test user for login tests
            await app.handle('POST', '/api/register', {
                username: 'logintest',
                email: 'login@example.com',
                password: 'loginpass'
            });
        });
        
        it('should login with valid credentials', async () => {
            const response = await app.handle('POST', '/api/login', {
                username: 'logintest',
                password: 'loginpass'
            });
            
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.body.success, true);
            assert.strictEqual(response.body.user.username, 'logintest');
            assert.strictEqual(typeof response.body.token, 'string');
        });
        
        it('should reject login with invalid credentials', async () => {
            const response = await app.handle('POST', '/api/login', {
                username: 'logintest',
                password: 'wrongpassword'
            });
            
            assert.strictEqual(response.status, 401);
            assert.strictEqual(response.body.error, 'Invalid credentials');
        });
        
        it('should reject login with missing fields', async () => {
            const response = await app.handle('POST', '/api/login', {
                username: 'logintest'
                // Missing password
            });
            
            assert.strictEqual(response.status, 400);
            assert.strictEqual(response.body.error, 'Missing credentials');
        });
    });
    
    describe('Score Management', () => {
        before(async () => {
            // Register a test user for score tests
            await app.handle('POST', '/api/register', {
                username: 'scoretest',
                email: 'score@example.com',
                password: 'scorepass'
            });
        });
        
        it('should update score successfully', async () => {
            const response = await app.handle('POST', '/api/score', {
                username: 'scoretest',
                score: 150,
                gameTime: 30
            });
            
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.body.success, true);
            assert.strictEqual(response.body.newScore, 150);
        });
        
        it('should reject negative scores', async () => {
            const response = await app.handle('POST', '/api/score', {
                username: 'scoretest',
                score: -10,
                gameTime: 30
            });
            
            assert.strictEqual(response.status, 400);
            assert.strictEqual(response.body.error, 'Invalid score');
        });
        
        it('should reject suspiciously high scores', async () => {
            const response = await app.handle('POST', '/api/score', {
                username: 'scoretest',
                score: 1000,
                gameTime: 10 // 100 points per second is suspicious
            });
            
            assert.strictEqual(response.status, 400);
            assert.strictEqual(response.body.error, 'Suspicious score detected');
        });
        
        it('should keep highest score', async () => {
            // Set initial high score
            await app.handle('POST', '/api/score', {
                username: 'scoretest',
                score: 200,
                gameTime: 40
            });
            
            // Try to set lower score
            const response = await app.handle('POST', '/api/score', {
                username: 'scoretest',
                score: 100,
                gameTime: 20
            });
            
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.body.newScore, 200); // Should keep higher score
        });
    });
    
    describe('Leaderboard', () => {
        before(async () => {
            // Register multiple users with different scores
            const users = [
                { username: 'player1', score: 300 },
                { username: 'player2', score: 150 },
                { username: 'player3', score: 450 },
                { username: 'player4', score: 200 }
            ];
            
            for (const user of users) {
                await app.handle('POST', '/api/register', {
                    username: user.username,
                    email: `${user.username}@example.com`,
                    password: 'password123'
                });
                
                await app.handle('POST', '/api/score', {
                    username: user.username,
                    score: user.score,
                    gameTime: 60
                });
            }
        });
        
        it('should return leaderboard sorted by score', async () => {
            const response = await app.handle('GET', '/api/leaderboard');
            
            assert.strictEqual(response.status, 200);
            assert.strictEqual(response.body.success, true);
            assert.strictEqual(Array.isArray(response.body.leaderboard), true);
            
            const leaderboard = response.body.leaderboard;
            
            // Should be sorted by score (highest first)
            for (let i = 1; i < leaderboard.length; i++) {
                assert.strictEqual(
                    leaderboard[i-1].score >= leaderboard[i].score,
                    true,
                    'Leaderboard should be sorted by score'
                );
            }
            
            // Top player should be player3 with 450 points
            assert.strictEqual(leaderboard[0].username, 'player3');
            assert.strictEqual(leaderboard[0].score, 450);
        });
    });
});

console.log('✅ API integration tests loaded');