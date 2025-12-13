const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const path = require('path');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');

// Load environment variables from .env file
require('dotenv').config(); 

// Database selection based on environment
const usePostgreSQL = process.env.DATABASE_URL && process.env.USE_POSTGRESQL === 'true';
const DB = usePostgreSQL ? require('./postgresql-db') : require('./simple-db');

// Environment variables with defaults
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const ENERGY_REGENERATION_MINUTES = parseInt(process.env.ENERGY_REGENERATION_MINUTES) || 5;
const MAX_ENERGY = parseInt(process.env.MAX_ENERGY) || 100;
const GAME_ENERGY_COST = parseInt(process.env.GAME_ENERGY_COST) || 10;
const INITIAL_ENERGY = parseInt(process.env.INITIAL_ENERGY) || 100;

// Rate limiting configuration
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS ? 
    process.env.ALLOWED_ORIGINS.split(',') : 
    ['http://localhost:3000', 'http://127.0.0.1:3000'];

// Production'da Render URL'ini otomatik ekle
if (NODE_ENV === 'production' && process.env.RENDER_EXTERNAL_URL) {
    allowedOrigins.push(process.env.RENDER_EXTERNAL_URL);
}

// Socket.IO configuration
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    },
    pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT) || 60000,
    pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL) || 25000
});

// Security Headers Middleware
app.use((req, res, next) => {
    // CORS
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Security Headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // Content Security Policy
    if (NODE_ENV === 'production') {
        res.setHeader('Content-Security-Policy', 
            "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline'; " +
            "style-src 'self' 'unsafe-inline' fonts.googleapis.com; " +
            "font-src 'self' fonts.gstatic.com; " +
            "connect-src 'self' ws: wss:; " +
            "img-src 'self' data:; " +
            "frame-ancestors 'none';"
        );
    }
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }
    next();
});

// Middleware setup
app.use(limiter); // Apply rate limiting to all requests
app.use(bodyParser.json({ limit: '10mb' })); // Limit JSON payload size
app.use(express.static(path.join(__dirname, 'public')));

// --- PWA ROUTES ---
// Serve manifest.json with correct content-type
app.get('/manifest.json', (req, res) => {
    res.setHeader('Content-Type', 'application/manifest+json');
    res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});

// Serve service worker with correct content-type
app.get('/sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(__dirname, 'public', 'sw.js'));
});

// Serve browserconfig.xml for Microsoft tiles
app.get('/browserconfig.xml', (req, res) => {
    res.setHeader('Content-Type', 'application/xml');
    res.sendFile(path.join(__dirname, 'public', 'browserconfig.xml'));
});

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        // Test database connection
        const { data, error } = await db.findPlayer('health-check-user');
        
        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: usePostgreSQL ? 'postgresql' : 'json',
            uptime: process.uptime()
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});



// --- DATABASE CONNECTION ---
console.log("🔍 Database Configuration:");
console.log("  DATABASE_URL exists:", !!process.env.DATABASE_URL);
console.log("  USE_POSTGRESQL:", process.env.USE_POSTGRESQL);
console.log("  Selected database:", usePostgreSQL ? "PostgreSQL" : "JSON");

const db = new DB();
if (usePostgreSQL) {
    console.log("🐘 Using PostgreSQL Database");
    console.log("  Connection string:", process.env.DATABASE_URL ? "SET" : "NOT SET");
} else {
    console.log("📄 Using JSON File Database");
}

// --- INPUT VALIDATION HELPERS ---
const validator = {
    isEmail: (email) => {
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        return emailRegex.test(email) && email.length <= 254;
    },
    
    isUsername: (username) => {
        const usernameRegex = /^[a-zA-Z0-9_-]+$/;
        return usernameRegex.test(username) && username.length >= 3 && username.length <= 30;
    },
    
    isPassword: (password) => {
        return password && password.length >= 6 && password.length <= 128;
    },
    
    sanitizeString: (str, maxLength = 255) => {
        if (typeof str !== 'string') return '';
        return str.trim().slice(0, maxLength).replace(/[<>]/g, '');
    },
    
    isValidScore: (score) => {
        return Number.isInteger(score) && score >= 0 && score <= 1000000;
    },
    
    isValidGameTime: (time) => {
        return Number.isInteger(time) && time >= 0 && time <= 3600; // Max 1 hour
    }
};

// --- AUTH MIDDLEWARE ---
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    const { data, error } = db.verifyToken(token);
    if (error) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }

    req.user = data;
    next();
}

// --- AUTH ROUTES ---
app.post('/api/register', async (req, res) => {
    try {
        console.log("📝 Registration attempt:", { 
            username: req.body.username, 
            email: req.body.email,
            hasPassword: !!req.body.password 
        });

        const { username, email, password } = req.body;

        // Input validation
        if (!username || !email || !password) {
            console.log("❌ Missing required fields");
            return res.status(400).json({ error: 'Username, email and password are required' });
        }

        // Sanitize inputs
        const cleanUsername = validator.sanitizeString(username, 30);
        const cleanEmail = validator.sanitizeString(email, 254).toLowerCase();
        
        // Validate username
        if (!validator.isUsername(cleanUsername)) {
            return res.status(400).json({ 
                error: 'Username must be 3-30 characters and contain only letters, numbers, underscore, and dash' 
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

app.post('/api/login', async (req, res) => {
    try {
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

// Protected route example
app.get('/api/profile', authenticateToken, async (req, res) => {
    const { data: user } = await db.findPlayer(req.user.username);
    if (user) {
        const { password, ...userProfile } = user;
        res.json({ user: userProfile });
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});

// Profil güncelleme
app.put('/api/profile', authenticateToken, async (req, res) => {
    try {
        const { displayName, bio, avatar, country, theme } = req.body;
        
        // Sanitize and validate inputs
        const cleanDisplayName = displayName ? validator.sanitizeString(displayName, 50) : undefined;
        const cleanBio = bio ? validator.sanitizeString(bio, 200) : undefined;
        const cleanAvatar = avatar ? validator.sanitizeString(avatar, 10) : undefined;
        const cleanCountry = country ? validator.sanitizeString(country, 5) : undefined;
        const cleanTheme = theme ? validator.sanitizeString(theme, 20) : undefined;
        
        // Validate display name
        if (cleanDisplayName !== undefined) {
            if (cleanDisplayName.length === 0 || cleanDisplayName.length > 50) {
                return res.status(400).json({ error: 'Display name must be 1-50 characters' });
            }
        }
        
        // Validate bio
        if (cleanBio !== undefined && cleanBio.length > 200) {
            return res.status(400).json({ error: 'Bio must be less than 200 characters' });
        }

        // Validate theme
        const allowedThemes = ['cyberpunk', 'dark', 'blue', 'purple'];
        if (cleanTheme !== undefined && !allowedThemes.includes(cleanTheme)) {
            return res.status(400).json({ error: 'Invalid theme selected' });
        }

        // Validate country code
        if (cleanCountry !== undefined && cleanCountry.length > 0) {
            const allowedCountries = ['TR', 'US', 'GB', 'DE', 'FR', 'JP', 'KR', 'CN'];
            if (!allowedCountries.includes(cleanCountry)) {
                return res.status(400).json({ error: 'Invalid country selected' });
            }
        }

        const result = await db.updateProfile(req.user.username, {
            displayName: cleanDisplayName,
            bio: cleanBio,
            avatar: cleanAvatar,
            country: cleanCountry,
            theme: cleanTheme
        });
        
        if (result.error) {
            return res.status(400).json({ error: result.error });
        }

        res.json({ 
            message: 'Profile updated successfully', 
            user: result.data 
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Oyuncu istatistikleri
app.get('/api/profile/stats', authenticateToken, async (req, res) => {
    const result = await db.getPlayerStats(req.user.username);
    
    if (result.error) {
        return res.status(404).json({ error: result.error });
    }

    res.json({ stats: result.data });
});

// Oyuncu başarımları
app.get('/api/achievements', authenticateToken, async (req, res) => {
    const result = await db.getPlayerAchievements(req.user.username);
    
    if (result.error) {
        return res.status(404).json({ error: result.error });
    }

    res.json({ achievements: result.data });
});

// --- REAL-TIME GAME SOCKET ---

io.on('connection', (socket) => {
    socket.currentUser = null;
    socket.isAuthenticated = false;

    // 1. User Joins Game with JWT Token
    socket.on('join game', async (payload) => {
        const { token } = payload;
        
        if (!token) {
            socket.emit('auth_error', 'Authentication token required');
            return;
        }

        // JWT token doğrulama
        const { data: decoded, error } = db.verifyToken(token);
        if (error) {
            socket.emit('auth_error', 'Invalid or expired token');
            return;
        }

        // Kullanıcı bilgilerini ayarla
        socket.currentUser = decoded.username;
        socket.userId = decoded.userId;
        socket.isAuthenticated = true;
        
        console.log(`✅ User authenticated and joined: ${decoded.username}`);
        finalizeJoin(socket, decoded.username);
    });

    // Helper to finish the join process after auth success
    async function finalizeJoin(socket, username) {
        socket.broadcast.emit('chat message', { 
            user: 'System', 
            text: `${username} connected to node.` 
        });
        
        // Kullanıcıyı veritabanına ekle veya skoru getir
        const { data: existingPlayer } = await db.findPlayer(username);
        
        if (existingPlayer) {
            // Mevcut kullanıcının skorunu gönder
            socket.emit('sync score', existingPlayer.score);
            
            // Enerji durumunu güncelle ve gönder
            const energyResult = await db.getPlayerEnergy(username);
            if (energyResult.data) {
                socket.emit('sync energy', energyResult.data);
            }
        } else {
            // Yeni kullanıcı oluştur
            await db.upsertPlayer(username, 0, '');
            socket.emit('sync energy', { 
                energy: INITIAL_ENERGY, 
                energyAdded: 0, 
                nextEnergyIn: ENERGY_REGENERATION_MINUTES 
            });
        }
        
        updateLeaderboard();
    }

    // 2. Chat System (Protected)
    socket.on('chat message', (msg) => {
        if(!socket.currentUser || !socket.isAuthenticated) return; // Block unverified chat
        
        // Validate and sanitize message
        if (typeof msg !== 'string') return;
        const cleanMsg = validator.sanitizeString(msg, 500);
        if (cleanMsg.length === 0 || cleanMsg.length > 500) return;
        
        // Rate limiting for chat (max 5 messages per 10 seconds)
        const now = Date.now();
        if (!socket.lastMessages) socket.lastMessages = [];
        socket.lastMessages = socket.lastMessages.filter(time => now - time < 10000);
        
        if (socket.lastMessages.length >= 5) {
            socket.emit('chat message', { 
                user: 'System', 
                text: 'Rate limit exceeded. Please slow down.' 
            });
            return;
        }
        
        socket.lastMessages.push(now);
        io.emit('chat message', { user: socket.currentUser, text: cleanMsg });
    });

    // 3. Score Submission (Protected)
    socket.on('submit score', async (data) => {
        if(!socket.currentUser || !socket.isAuthenticated) return; // Block hackers
        
        try {
            const { score, gameTime, won } = data;
            
            // Validate score and game time
            if (!validator.isValidScore(score)) {
                console.warn(`Invalid score from ${socket.currentUser}: ${score}`);
                return;
            }
            
            if (!validator.isValidGameTime(gameTime)) {
                console.warn(`Invalid game time from ${socket.currentUser}: ${gameTime}`);
                return;
            }
            
            if (typeof won !== 'boolean') {
                console.warn(`Invalid won status from ${socket.currentUser}: ${won}`);
                return;
            }
            
            // Anti-cheat: Check if score is reasonable for the time taken
            const maxScorePerSecond = 10; // Reasonable max score per second
            if (gameTime > 0 && score > (gameTime * maxScorePerSecond + 100)) {
                console.warn(`Suspicious score from ${socket.currentUser}: ${score} in ${gameTime}s`);
                return;
            }
            
            // Rate limiting for score submission (max 1 per 5 seconds)
            const now = Date.now();
            if (socket.lastScoreSubmit && now - socket.lastScoreSubmit < 5000) {
                return;
            }
            socket.lastScoreSubmit = now;
            
            // Skoru güncelle
            await db.upsertPlayer(socket.currentUser, score, '');
            
            // Oyun istatistiklerini güncelle
            const gameResult = await db.updateGameStats(socket.currentUser, gameTime, won);
            
            // Yeni başarımlar varsa bildir
            if (gameResult.newAchievements && gameResult.newAchievements.length > 0) {
                socket.emit('new achievements', gameResult.newAchievements);
            }
            
            updateLeaderboard();
        } catch (err) {
            console.error("Error saving score:", err.message);
        }
    });

    // 4. Energy Usage (Protected)
    socket.on('use energy', async (amount) => {
        if(!socket.currentUser || !socket.isAuthenticated) return;
        
        try {
            // Validate energy amount
            if (!Number.isInteger(amount) || amount <= 0 || amount > 100) {
                console.warn(`Invalid energy amount from ${socket.currentUser}: ${amount}`);
                return;
            }
            
            // Only allow game energy cost
            if (amount !== GAME_ENERGY_COST) {
                console.warn(`Unauthorized energy usage from ${socket.currentUser}: ${amount}`);
                return;
            }
            
            const result = await db.updatePlayerEnergy(socket.currentUser, -amount);
            if (result.data) {
                socket.emit('sync energy', result.data);
                
                // Eğer enerji yetersizse hata gönder
                if (result.data.energy < GAME_ENERGY_COST) {
                    socket.emit('energy error', 'Insufficient energy');
                }
            }
        } catch (err) {
            console.error("Error updating energy:", err.message);
        }
    });

    // 5. Energy Check (Protected)
    socket.on('check energy', async () => {
        if(!socket.currentUser || !socket.isAuthenticated) return;
        
        try {
            const result = await db.getPlayerEnergy(socket.currentUser);
            if (result.data) {
                socket.emit('sync energy', result.data);
            }
        } catch (err) {
            console.error("Error checking energy:", err.message);
        }
    });

    // 6. Disconnect
    socket.on('disconnect', () => { 
        if(socket.currentUser) console.log(`${socket.currentUser} disconnected`); 
    });

    async function updateLeaderboard() {
        const { data, error } = await db.getLeaderboard(10);
        if (data && !error) io.emit('update leaderboard', data);
    }
});

// --- ENERGY REGENERATION SYSTEM ---
setInterval(async () => {
    // Her dakika tüm aktif oyuncuları kontrol et ve enerji durumlarını güncelle
    const connectedSockets = await io.fetchSockets();
    
    for (const socket of connectedSockets) {
        if (socket.currentUser && socket.isAuthenticated) {
            try {
                const result = await db.getPlayerEnergy(socket.currentUser);
                if (result.data && result.data.energyAdded > 0) {
                    // Enerji yenilendiyse oyuncuya bildir
                    socket.emit('sync energy', result.data);
                    socket.emit('chat message', { 
                        user: 'System', 
                        text: `Energy regenerated! +${result.data.energyAdded} energy` 
                    });
                }
            } catch (err) {
                console.error("Energy regeneration error:", err.message);
            }
        }
    }
}, 60000); // Her dakika kontrol et

server.listen(PORT, () => {
  console.log(`🚀 CipherNode Server running on http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`⚡ Energy regeneration: 1 energy per ${ENERGY_REGENERATION_MINUTES} minutes`);
  console.log(`🛡️  Rate limiting: ${process.env.RATE_LIMIT_MAX_REQUESTS || 100} requests per ${(parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000)/60000} minutes`);
  console.log(`🎮 Game settings: ${GAME_ENERGY_COST} energy per game, max ${MAX_ENERGY} energy`);
});