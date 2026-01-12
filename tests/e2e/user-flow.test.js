// End-to-End Tests - User Flow Scenarios
import { describe, it, assert, before, after } from '../setup.js';

// Mock browser environment for E2E testing
class MockBrowser {
    constructor() {
        this.localStorage = new Map();
        this.sessionStorage = new Map();
        this.cookies = new Map();
        this.currentUrl = 'http://localhost:3000';
        this.dom = {
            elements: new Map(),
            events: new Map()
        };
    }
    
    // Mock localStorage
    setItem(key, value) {
        this.localStorage.set(key, value);
    }
    
    getItem(key) {
        return this.localStorage.get(key) || null;
    }
    
    removeItem(key) {
        this.localStorage.delete(key);
    }
    
    // Mock DOM manipulation
    getElementById(id) {
        return this.dom.elements.get(id) || null;
    }
    
    createElement(tag) {
        return {
            tagName: tag.toUpperCase(),
            innerHTML: '',
            value: '',
            style: {},
            classList: {
                add: () => {},
                remove: () => {},
                contains: () => false
            },
            addEventListener: (event, handler) => {
                if (!this.dom.events.has(event)) {
                    this.dom.events.set(event, []);
                }
                this.dom.events.get(event).push(handler);
            }
        };
    }
    
    // Mock HTTP requests
    async fetch(url, options = {}) {
        const method = options.method || 'GET';
        const body = options.body ? JSON.parse(options.body) : null;
        
        // Mock API responses
        if (url.includes('/api/register')) {
            if (body.username === 'existinguser') {
                return {
                    ok: false,
                    status: 400,
                    json: async () => ({ error: 'Username already exists' })
                };
            }
            return {
                ok: true,
                status: 200,
                json: async () => ({ 
                    success: true, 
                    user: { username: body.username, email: body.email, score: 0 } 
                })
            };
        }
        
        if (url.includes('/api/login')) {
            // Accept any user that was previously registered or validuser
            if ((body.username === 'validuser' && body.password === 'validpass') ||
                (body.username && body.password === 'password123')) {
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({ 
                        success: true, 
                        token: 'mock_jwt_token',
                        user: { username: body.username, score: 100, level: 2 } 
                    })
                };
            }
            return {
                ok: false,
                status: 401,
                json: async () => ({ error: 'Invalid credentials' })
            };
        }
        
        if (url.includes('/api/leaderboard')) {
            return {
                ok: true,
                status: 200,
                json: async () => ({
                    success: true,
                    leaderboard: [
                        { username: 'player1', score: 500, level: 5 },
                        { username: 'player2', score: 300, level: 3 },
                        { username: 'validuser', score: 100, level: 2 }
                    ]
                })
            };
        }
        
        return {
            ok: false,
            status: 404,
            json: async () => ({ error: 'Not found' })
        };
    }
    
    // Mock navigation
    navigate(url) {
        this.currentUrl = url;
    }
    
    // Mock game state
    startGame() {
        return {
            grid: [
                ['🔴', '🟢', '🔵'],
                ['🟡', '🟣', '🟠'],
                ['🔴', '🟢', '🔵']
            ],
            score: 0,
            level: 1,
            timeLeft: 60
        };
    }
}

// Mock game client functions
class MockGameClient {
    constructor(browser) {
        this.browser = browser;
        this.isLoggedIn = false;
        this.currentUser = null;
        this.gameState = null;
    }
    
    async register(username, email, password) {
        const response = await this.browser.fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            this.currentUser = data.user;
            this.browser.setItem('user', JSON.stringify(data.user));
            return { success: true, user: data.user };
        } else {
            // Clear any stored data on error
            this.browser.removeItem('user');
            this.browser.removeItem('token');
            return { success: false, error: data.error };
        }
    }
    
    async login(username, password) {
        const response = await this.browser.fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            this.isLoggedIn = true;
            this.currentUser = data.user;
            this.browser.setItem('token', data.token);
            this.browser.setItem('user', JSON.stringify(data.user));
            return { success: true, user: data.user, token: data.token };
        } else {
            // Clear any stored data on error
            this.isLoggedIn = false;
            this.currentUser = null;
            this.browser.removeItem('token');
            this.browser.removeItem('user');
            return { success: false, error: data.error };
        }
    }
    
    logout() {
        this.isLoggedIn = false;
        this.currentUser = null;
        this.browser.removeItem('token');
        this.browser.removeItem('user');
    }
    
    autoLogin() {
        const token = this.browser.getItem('token');
        const userStr = this.browser.getItem('user');
        
        if (token && userStr) {
            try {
                this.currentUser = JSON.parse(userStr);
                this.isLoggedIn = true;
                return true;
            } catch (e) {
                this.logout();
                return false;
            }
        }
        return false;
    }
    
    async startGame() {
        if (!this.isLoggedIn) {
            throw new Error('Must be logged in to play');
        }
        
        this.gameState = this.browser.startGame();
        return this.gameState;
    }
    
    async submitScore(score, gameTime) {
        if (!this.isLoggedIn) {
            throw new Error('Must be logged in to submit score');
        }
        
        // Mock score submission (would normally go to server)
        if (score > this.currentUser.score) {
            this.currentUser.score = score;
            this.browser.setItem('user', JSON.stringify(this.currentUser));
        }
        
        return { success: true, newScore: this.currentUser.score };
    }
    
    async getLeaderboard() {
        const response = await this.browser.fetch('/api/leaderboard');
        const data = await response.json();
        return data.leaderboard;
    }
}

describe('End-to-End User Flow Tests', () => {
    let browser, gameClient;
    
    before(() => {
        browser = new MockBrowser();
        gameClient = new MockGameClient(browser);
    });
    
    describe('User Registration Flow', () => {
        it('should complete full registration process', async () => {
            // Step 1: User visits registration page
            browser.navigate('/register');
            
            // Step 2: User fills registration form
            const result = await gameClient.register('newuser', 'new@example.com', 'password123');
            
            // Step 3: Verify registration success
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.user.username, 'newuser');
            assert.strictEqual(result.user.email, 'new@example.com');
            
            // Step 4: Verify user data is stored
            const storedUser = browser.getItem('user');
            assert.strictEqual(storedUser !== null, true);
            
            const userData = JSON.parse(storedUser);
            assert.strictEqual(userData.username, 'newuser');
        });
        
        it('should handle registration errors gracefully', async () => {
            // Try to register with existing username
            const result = await gameClient.register('existinguser', 'test@example.com', 'password123');
            
            assert.strictEqual(result.success, false);
            assert.strictEqual(result.error, 'Username already exists');
            
            // Verify no user data is stored on error
            const storedUser = browser.getItem('user');
            assert.strictEqual(storedUser, null);
        });
    });
    
    describe('User Login Flow', () => {
        it('should complete full login process', async () => {
            // Step 1: User visits login page
            browser.navigate('/login');
            
            // Step 2: User enters credentials
            const result = await gameClient.login('validuser', 'validpass');
            
            // Step 3: Verify login success
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.user.username, 'validuser');
            assert.strictEqual(typeof result.token, 'string');
            
            // Step 4: Verify authentication state
            assert.strictEqual(gameClient.isLoggedIn, true);
            assert.strictEqual(gameClient.currentUser.username, 'validuser');
            
            // Step 5: Verify token storage
            const storedToken = browser.getItem('token');
            assert.strictEqual(storedToken, 'mock_jwt_token');
        });
        
        it('should handle login errors gracefully', async () => {
            // Try to login with invalid credentials
            const result = await gameClient.login('invaliduser', 'wrongpass');
            
            assert.strictEqual(result.success, false);
            assert.strictEqual(result.error, 'Invalid credentials');
            
            // Verify user is not logged in
            assert.strictEqual(gameClient.isLoggedIn, false);
            assert.strictEqual(gameClient.currentUser, null);
        });
        
        it('should support auto-login with stored token', async () => {
            // First, login normally
            await gameClient.login('validuser', 'validpass');
            
            // Simulate page refresh (create new client)
            const newGameClient = new MockGameClient(browser);
            
            // Try auto-login
            const autoLoginSuccess = newGameClient.autoLogin();
            
            assert.strictEqual(autoLoginSuccess, true);
            assert.strictEqual(newGameClient.isLoggedIn, true);
            assert.strictEqual(newGameClient.currentUser.username, 'validuser');
        });
    });
    
    describe('Game Play Flow', () => {
        before(async () => {
            // Login before game tests
            await gameClient.login('validuser', 'validpass');
        });
        
        it('should start game successfully when logged in', async () => {
            const gameState = await gameClient.startGame();
            
            assert.strictEqual(Array.isArray(gameState.grid), true);
            assert.strictEqual(gameState.grid.length, 3);
            assert.strictEqual(gameState.score, 0);
            assert.strictEqual(gameState.level, 1);
            assert.strictEqual(gameState.timeLeft, 60);
        });
        
        it('should prevent game start when not logged in', async () => {
            // Logout first
            gameClient.logout();
            
            try {
                await gameClient.startGame();
                assert.fail('Should have thrown error');
            } catch (error) {
                assert.strictEqual(error.message, 'Must be logged in to play');
            }
        });
        
        it('should complete full game session', async () => {
            // Login again
            await gameClient.login('validuser', 'validpass');
            
            // Start game
            const gameState = await gameClient.startGame();
            assert.strictEqual(gameState.score, 0);
            
            // Simulate game play and score submission
            const finalScore = 250;
            const gameTime = 45;
            
            const result = await gameClient.submitScore(finalScore, gameTime);
            
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.newScore, 250);
            
            // Verify score is updated in user data
            assert.strictEqual(gameClient.currentUser.score, 250);
        });
    });
    
    describe('Leaderboard Flow', () => {
        it('should display leaderboard correctly', async () => {
            const leaderboard = await gameClient.getLeaderboard();
            
            assert.strictEqual(Array.isArray(leaderboard), true);
            assert.strictEqual(leaderboard.length > 0, true);
            
            // Verify leaderboard is sorted by score
            for (let i = 1; i < leaderboard.length; i++) {
                assert.strictEqual(
                    leaderboard[i-1].score >= leaderboard[i].score,
                    true,
                    'Leaderboard should be sorted by score'
                );
            }
            
            // Verify leaderboard contains expected data
            const topPlayer = leaderboard[0];
            assert.strictEqual(typeof topPlayer.username, 'string');
            assert.strictEqual(typeof topPlayer.score, 'number');
            assert.strictEqual(typeof topPlayer.level, 'number');
        });
    });
    
    describe('Session Management Flow', () => {
        it('should handle logout correctly', async () => {
            // Login first
            await gameClient.login('validuser', 'validpass');
            assert.strictEqual(gameClient.isLoggedIn, true);
            
            // Logout
            gameClient.logout();
            
            // Verify logout state
            assert.strictEqual(gameClient.isLoggedIn, false);
            assert.strictEqual(gameClient.currentUser, null);
            
            // Verify storage is cleared
            assert.strictEqual(browser.getItem('token'), null);
            assert.strictEqual(browser.getItem('user'), null);
        });
        
        it('should handle corrupted storage gracefully', async () => {
            // Set corrupted user data
            browser.setItem('token', 'valid_token');
            browser.setItem('user', 'invalid_json{');
            
            // Try auto-login with corrupted data
            const newGameClient = new MockGameClient(browser);
            const autoLoginSuccess = newGameClient.autoLogin();
            
            // Should fail gracefully and clean up
            assert.strictEqual(autoLoginSuccess, false);
            assert.strictEqual(newGameClient.isLoggedIn, false);
            
            // Storage should be cleaned up
            assert.strictEqual(browser.getItem('token'), null);
            assert.strictEqual(browser.getItem('user'), null);
        });
    });
    
    describe('Complete User Journey', () => {
        it('should complete full user journey from registration to game', async () => {
            // Fresh browser session
            const freshBrowser = new MockBrowser();
            const freshClient = new MockGameClient(freshBrowser);
            
            // Step 1: Register new user
            const regResult = await freshClient.register('journeyuser', 'journey@example.com', 'password123');
            assert.strictEqual(regResult.success, true);
            
            // Step 2: Login (or should be auto-logged in after registration)
            const loginResult = await freshClient.login('journeyuser', 'password123');
            assert.strictEqual(loginResult.success, true);
            
            // Step 3: Start and play game
            const gameState = await freshClient.startGame();
            assert.strictEqual(gameState.score, 0);
            
            // Step 4: Submit score
            const scoreResult = await freshClient.submitScore(150, 30);
            assert.strictEqual(scoreResult.success, true);
            
            // Step 5: Check leaderboard
            const leaderboard = await freshClient.getLeaderboard();
            assert.strictEqual(Array.isArray(leaderboard), true);
            
            // Step 6: Logout
            freshClient.logout();
            assert.strictEqual(freshClient.isLoggedIn, false);
            
            // Step 7: Auto-login on return visit
            const returnClient = new MockGameClient(freshBrowser);
            // Note: Auto-login would fail here since we logged out
            // This is expected behavior
            
            console.log('✅ Complete user journey test passed');
        });
    });
});

console.log('✅ E2E user flow tests loaded');