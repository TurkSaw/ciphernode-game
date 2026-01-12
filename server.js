import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import adminRoutes from './routes/admin.routes.js';
import validator from './utils/validator.js';

// ES modules __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config();

const app = express();
const server = http.createServer(app);

// Supabase-only database configuration
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error('❌ CRITICAL: SUPABASE_URL and SUPABASE_ANON_KEY must be configured!');
    console.error('Please check your .env file and ensure Supabase credentials are set.');
    process.exit(1);
}

// Dynamic import for Supabase database module
async function loadDatabaseModule() {
    const { default: SupabaseDBClass } = await import('./supabase-db.js');
    return SupabaseDBClass;
}

// Initialize database module
let SupabaseDB = null;

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

// Database middleware
app.use((req, res, next) => {
    req.db = db;

    // Return 503 if database is offline, but allow health check and static assets
    if (req.path.startsWith('/api') && !dbConnectionHealthy) {
        return res.status(503).json({
            error: 'Service Unavailable',
            message: 'Database connection is currently unavailable.'
        });
    }

    next();
});

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
        let dbStatus = 'unknown';
        let dbError = null;

        if (dbConnectionHealthy) {
            try {
                // Test database connection
                const { error } = await db.findPlayer('health-check-user');
                dbStatus = error ? 'degraded' : 'healthy';
                dbError = error;
            } catch (testError) {
                dbStatus = 'unhealthy';
                dbError = testError.message;
                dbConnectionHealthy = false;
            }
        } else {
            dbStatus = 'unavailable';
            dbError = 'Database connection not established';
        }

        const healthData = {
            status: dbConnectionHealthy ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            database: {
                type: 'supabase',
                status: dbStatus,
                error: dbError
            },
            uptime: Math.floor(process.uptime()),
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
            },
            features: {
                authentication: dbConnectionHealthy,
                chat: dbConnectionHealthy,
                leaderboard: dbConnectionHealthy,
                gameProgress: dbConnectionHealthy
            }
        };

        const statusCode = dbConnectionHealthy ? 200 : 503;
        res.status(statusCode).json(healthData);

    } catch (error) {
        console.error('Health check failed:', error.message);
        res.status(503).json({
            status: 'critical',
            error: 'Health check system failure',
            timestamp: new Date().toISOString(),
            uptime: Math.floor(process.uptime())
        });
    }
});



// --- DATABASE CONNECTION ---
let db;
let dbConnectionHealthy = false;

async function initializeDatabase() {
    try {
        // Load Supabase database module
        SupabaseDB = await loadDatabaseModule();

        console.log("🔄 Initializing Supabase connection...");
        db = new SupabaseDB();

        if (!db) {
            throw new Error('Failed to create Supabase database instance');
        }

        // Test Supabase connection
        await db.initDatabase();
        dbConnectionHealthy = true;
        console.log("🚀 Successfully connected to Supabase Database");

    } catch (error) {
        console.error("💥 Critical Supabase initialization error:", error.message);
        console.error("Please check your Supabase configuration and network connection.");
        dbConnectionHealthy = false;

        // Create a minimal fallback database interface for graceful degradation
        db = {
            async registerUser() { return { data: null, error: 'Supabase connection unavailable' }; },
            async loginUser() { return { data: null, error: 'Supabase connection unavailable' }; },
            async findPlayer() { return { data: null, error: 'Supabase connection unavailable' }; },
            async getLeaderboard() { return { data: [], error: 'Supabase connection unavailable' }; },
            async saveChatMessage() { return { data: null, error: 'Supabase connection unavailable' }; },
            async getChatMessages() { return { data: [], error: 'Supabase connection unavailable' }; },
            verifyToken() { return { data: null, error: 'Supabase connection unavailable' }; }
        };

        console.log("🆘 Running in emergency mode - please fix Supabase configuration");

        // Exit in production to prevent running with broken database
        if (NODE_ENV === 'production') {
            console.error("🚨 Exiting in production mode due to database failure");
            process.exit(1);
        }
    }
}

// Initialize database with error handling
initializeDatabase().catch(error => {
    console.error("🚨 Failed to initialize database:", error.message);
});


// --- INPUT VALIDATION HELPERS ---
// Imported from utils/validator.js


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
app.use('/api', authRoutes());
app.use('/api', userRoutes(authenticateToken));
app.use('/api/admin', adminRoutes(authenticateToken));


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

        // Update connected users count
        connectedUsers++;

        console.log(`✅ User authenticated and joined: ${decoded.username} (${connectedUsers} users online)`);
        finalizeJoin(socket, decoded.username);
    });

    // Helper to finish the join process after auth success
    async function finalizeJoin(socket, username) {
        try {
            // Check database health before proceeding
            if (!dbConnectionHealthy) {
                socket.emit('auth_error', 'Database temporarily unavailable. Please try again later.');
                return;
            }

            // Sistem mesajını kaydet ve gönder
            try {
                await db.saveChatMessage('System', `${username} connected to node.`);
                socket.broadcast.emit('chat message', {
                    user: 'System',
                    text: `${username} connected to node.`
                });
            } catch (chatError) {
                console.error(`Failed to save connection message for ${username}:`, chatError.message);
                // Continue without chat message - not critical
            }

            // Kullanıcıya son chat mesajlarını gönder
            try {
                const { data: chatHistory, error: chatError } = await db.getChatMessages(20); // Son 20 mesaj
                if (chatError) {
                    console.error(`Failed to load chat history for ${username}:`, chatError);
                    // Send a default message instead
                    socket.emit('chat message', {
                        user: 'System',
                        text: 'Welcome to CipherNode! Chat history temporarily unavailable.',
                        timestamp: new Date().toISOString()
                    });
                } else if (chatHistory && chatHistory.length > 0) {
                    chatHistory.forEach(msg => {
                        socket.emit('chat message', {
                            user: msg.username,
                            text: msg.message,
                            timestamp: msg.timestamp
                        });
                    });
                }
            } catch (chatError) {
                console.error(`Critical chat error for ${username}:`, chatError.message);
                // Send fallback message
                socket.emit('chat message', {
                    user: 'System',
                    text: 'Welcome to CipherNode!',
                    timestamp: new Date().toISOString()
                });
            }

            // Kullanıcıyı veritabanına ekle veya skoru getir
            const { data: existingPlayer, error: playerError } = await db.findPlayer(username);

            if (playerError) {
                console.error(`Failed to find player ${username}:`, playerError);
                socket.emit('auth_error', 'Database error occurred');
                return;
            }

            if (existingPlayer) {
                // Mevcut kullanıcının skorunu ve level'ını gönder
                socket.emit('sync score', existingPlayer.score || 0);
                socket.emit('sync level', existingPlayer.level || 1);
                console.log(`🔄 Synced user ${username}: Score ${existingPlayer.score || 0}, Level ${existingPlayer.level || 1}`);

                // Enerji durumunu güncelle ve gönder
                const energyResult = await db.getPlayerEnergy(username);
                if (energyResult.error) {
                    console.error(`Failed to get energy for ${username}:`, energyResult.error);
                    socket.emit('sync energy', {
                        energy: INITIAL_ENERGY,
                        energyAdded: 0,
                        nextEnergyIn: ENERGY_REGENERATION_MINUTES
                    });
                } else if (energyResult.data) {
                    socket.emit('sync energy', energyResult.data);
                }
            } else {
                // Bu durumda kullanıcı JWT ile authenticated ama database'de yok
                // Bu normal bir durum değil, ama güvenlik için handle edelim
                console.warn(`Authenticated user ${username} not found in database`);
                socket.emit('sync energy', {
                    energy: INITIAL_ENERGY,
                    energyAdded: 0,
                    nextEnergyIn: ENERGY_REGENERATION_MINUTES
                });
                socket.emit('sync level', 1); // Default level
            }

            await updateLeaderboard();
        } catch (error) {
            console.error(`Error in finalizeJoin for ${username}:`, error.message);
            socket.emit('auth_error', 'Failed to initialize user session');
        }
    }

    // 2. Chat System (Protected)
    socket.on('chat message', (msg) => {
        if (!socket.currentUser || !socket.isAuthenticated) return; // Block unverified chat

        // Validate and sanitize message
        if (typeof msg !== 'string') return;
        const cleanMsg = validator.sanitizeString(msg, 500);
        if (cleanMsg.length === 0 || cleanMsg.length > 500) return;

        // Enhanced rate limiting for chat (per user basis)
        const now = Date.now();
        if (!socket.lastMessages) socket.lastMessages = [];

        // Clean old messages (older than 10 seconds)
        socket.lastMessages = socket.lastMessages.filter(time => now - time < 10000);

        // Progressive rate limiting based on user behavior
        const messageCount = socket.lastMessages.length;
        let maxMessages = 5; // Default: 5 messages per 10 seconds

        // Reduce limit for users who consistently hit the limit
        if (socket.rateLimitViolations && socket.rateLimitViolations > 3) {
            maxMessages = 3; // Stricter limit for repeat offenders
        }

        if (messageCount >= maxMessages) {
            if (!socket.rateLimitViolations) socket.rateLimitViolations = 0;
            socket.rateLimitViolations++;

            const waitTime = Math.ceil((10000 - (now - socket.lastMessages[0])) / 1000);
            socket.emit('chat message', {
                user: 'System',
                text: `Rate limit exceeded. Please wait ${waitTime} seconds before sending another message.`
            });
            return;
        }

        socket.lastMessages.push(now);

        // Reset violation count on good behavior
        if (messageCount === 0 && socket.rateLimitViolations > 0) {
            socket.rateLimitViolations = Math.max(0, socket.rateLimitViolations - 1);
        }

        // Mesajı database'e kaydet
        db.saveChatMessage(socket.currentUser, cleanMsg);

        // Tüm kullanıcılara gönder
        io.emit('chat message', { user: socket.currentUser, text: cleanMsg });
    });

    // 3. Score Submission (Protected)
    socket.on('submit score', async (data) => {
        if (!socket.currentUser || !socket.isAuthenticated) return; // Block hackers

        try {
            const { score, level, gameTime, won } = data;

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

            // Validate level
            if (!Number.isInteger(level) || level < 1 || level > 1000) {
                console.warn(`Invalid level from ${socket.currentUser}: ${level}`);
                return;
            }

            // Anti-cheat: Check if score is reasonable
            // We need to fetch the previous score to check the delta, 
            // but for performance, we'll just check if the total score is not impossibly high compared to level
            // Max score per level is 100. So Score <= Level * 100 (approximately)
            if (score > level * 150 + 500) { // Generous buffer
                console.warn(`Suspicious score from ${socket.currentUser}: ${score} at level ${level}`);
                // return; // Don't block for now, just log
            }

            // Rate limiting for score submission (max 1 per 5 seconds)
            const now = Date.now();
            if (socket.lastScoreSubmit && now - socket.lastScoreSubmit < 5000) {
                return;
            }
            socket.lastScoreSubmit = now;

            // Skoru ve level'ı güncelle
            await db.upsertPlayer(socket.currentUser, score, level);

            // Oyun istatistiklerini güncelle
            const gameResult = await db.updateGameStats(socket.currentUser, gameTime, won);

            // Yeni başarımlar varsa bildir
            if (gameResult.newAchievements && gameResult.newAchievements.length > 0) {
                socket.emit('new achievements', gameResult.newAchievements);
            }

            // Leaderboard'ı hemen güncelle (force update)
            await updateLeaderboard(true);
        } catch (err) {
            console.error("Error saving score:", err.message);
        }
    });

    // 4. Energy Usage (Protected)
    socket.on('use energy', async (amount) => {
        if (!socket.currentUser || !socket.isAuthenticated) return;

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
        if (!socket.currentUser || !socket.isAuthenticated) return;

        try {
            const result = await db.getPlayerEnergy(socket.currentUser);
            if (result.data) {
                socket.emit('sync energy', result.data);
            }
        } catch (err) {
            console.error("Error checking energy:", err.message);
        }
    });

    // 6. Manual Leaderboard Refresh (Debug)
    socket.on('request leaderboard update', async () => {
        if (!socket.currentUser || !socket.isAuthenticated) return;

        console.log(`Manual leaderboard refresh requested by ${socket.currentUser}`);
        await updateLeaderboard(true); // Force update
    });

    // 6.1. Manual User Data Sync
    socket.on('request user sync', async (payload) => {
        const { token } = payload;

        if (!token) return;

        // JWT token doğrulama
        const { data: decoded, error } = db.verifyToken(token);
        if (error || !decoded) return;

        try {
            // Fresh user data from database
            const { data: existingPlayer, error: playerError } = await db.findPlayer(decoded.username);

            if (!playerError && existingPlayer) {
                // Send fresh data to client
                socket.emit('sync score', existingPlayer.score || 0);
                socket.emit('sync level', existingPlayer.level || 1);

                console.log(`🔄 Manual sync for ${decoded.username}: Score ${existingPlayer.score || 0}, Level ${existingPlayer.level || 1}`);

                // Also refresh energy
                const energyResult = await db.getPlayerEnergy(decoded.username);
                if (!energyResult.error && energyResult.data) {
                    socket.emit('sync energy', energyResult.data);
                }
            }
        } catch (error) {
            console.error(`Error in manual user sync for ${decoded.username}:`, error.message);
        }
    });

    // 7. Disconnect - Memory leak prevention
    socket.on('disconnect', () => {
        if (socket.currentUser) {
            console.log(`${socket.currentUser} disconnected`);

            // Update connected users count
            connectedUsers = Math.max(0, connectedUsers - 1);

            // Cleanup timers and intervals to prevent memory leaks
            if (socket.energyTimer) {
                clearInterval(socket.energyTimer);
                socket.energyTimer = null;
            }

            // Clear rate limiting arrays
            if (socket.lastMessages) {
                socket.lastMessages = null;
            }

            // Clear user data
            socket.currentUser = null;
            socket.userId = null;
            socket.isAuthenticated = false;
        }
    });

    // Leaderboard caching with adaptive duration
    let leaderboardCache = null;
    let lastLeaderboardUpdate = 0;
    let connectedUsers = 0;

    // Adaptive cache duration based on activity
    function getLeaderboardCacheDuration() {
        if (connectedUsers > 10) return 15000; // 15 seconds for high activity
        if (connectedUsers > 5) return 30000;  // 30 seconds for medium activity
        return 60000; // 1 minute for low activity
    }

    async function updateLeaderboard(forceUpdate = false) {
        try {
            const now = Date.now();
            const cacheDuration = getLeaderboardCacheDuration();

            // Use cache if available and not expired
            if (!forceUpdate && leaderboardCache && (now - lastLeaderboardUpdate) < cacheDuration) {
                io.emit('update leaderboard', leaderboardCache);
                return;
            }

            const { data, error } = await db.getLeaderboard(10);
            if (error) {
                console.error('Failed to update leaderboard:', error);
                // Use cached data if available
                if (leaderboardCache) {
                    io.emit('update leaderboard', leaderboardCache);
                }
                return;
            }

            if (data) {
                leaderboardCache = data;
                lastLeaderboardUpdate = now;
                io.emit('update leaderboard', data);
            }
        } catch (error) {
            console.error('Leaderboard update error:', error.message);
            // Use cached data as fallback
            if (leaderboardCache) {
                io.emit('update leaderboard', leaderboardCache);
            }
        }
    }
});

// --- ENERGY REGENERATION SYSTEM ---
const energyRegenerationInterval = setInterval(async () => {
    try {
        // Her dakika tüm aktif oyuncuları kontrol et ve enerji durumlarını güncelle
        const connectedSockets = await io.fetchSockets();

        for (const socket of connectedSockets) {
            if (socket.currentUser && socket.isAuthenticated) {
                try {
                    const result = await db.getPlayerEnergy(socket.currentUser);
                    if (result.data && result.data.energyAdded > 0) {
                        // Enerji yenilendiyse oyuncuya bildir
                        socket.emit('sync energy', result.data);
                        const energyMsg = `Energy regenerated! +${result.data.energyAdded} energy`;
                        await db.saveChatMessage('System', energyMsg);
                        socket.emit('chat message', {
                            user: 'System',
                            text: energyMsg
                        });
                    }
                } catch (err) {
                    console.error(`Energy regeneration error for user ${socket.currentUser}:`, err.message);
                }
            }
        }
    } catch (err) {
        console.error("Energy regeneration system error:", err.message);
    }
}, 60000); // Her dakika kontrol et

// Graceful shutdown - cleanup intervals
process.on('SIGTERM', () => {
    console.log('SIGTERM received, cleaning up...');
    if (energyRegenerationInterval) {
        clearInterval(energyRegenerationInterval);
    }
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, cleaning up...');
    if (energyRegenerationInterval) {
        clearInterval(energyRegenerationInterval);
    }
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

server.listen(PORT, () => {
    console.log(`🚀 CipherNode Server running on http://localhost:${PORT}`);
    console.log(`🌍 Environment: ${NODE_ENV}`);
    console.log(`⚡ Energy regeneration: 1 energy per ${ENERGY_REGENERATION_MINUTES} minutes`);
    console.log(`🛡️  Rate limiting: ${process.env.RATE_LIMIT_MAX_REQUESTS || 100} requests per ${(parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000) / 60000} minutes`);
    console.log(`🎮 Game settings: ${GAME_ENERGY_COST} energy per game, max ${MAX_ENERGY} energy`);

    // Memory usage monitoring
    const memUsage = process.memoryUsage();
    console.log(`💾 Memory usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`);
});

// Memory monitoring interval (every 5 minutes)
if (NODE_ENV === 'production') {
    setInterval(() => {
        const memUsage = process.memoryUsage();
        const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
        const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

        console.log(`💾 Memory: ${heapUsedMB}MB / ${heapTotalMB}MB`);

        // Warning if memory usage is high
        if (heapUsedMB > 200) {
            console.warn(`⚠️  High memory usage detected: ${heapUsedMB}MB`);
        }
    }, 300000); // 5 minutes
}