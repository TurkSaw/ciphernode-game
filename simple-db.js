const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class SimpleDB {
    constructor() {
        this.dbPath = process.env.DB_PATH || path.join(__dirname, 'players.json');
        this.backupEnabled = process.env.DB_BACKUP_ENABLED === 'true';
        this.bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
        this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
        this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
        
        // JWT Secret rotation warning
        if (this.jwtSecret === 'your-secret-key') {
            console.warn('⚠️  WARNING: Using default JWT secret! Change JWT_SECRET in production!');
        }
        this.energyRegenMinutes = parseInt(process.env.ENERGY_REGENERATION_MINUTES) || 5;
        this.maxEnergy = parseInt(process.env.MAX_ENERGY) || 100;
        this.initialEnergy = parseInt(process.env.INITIAL_ENERGY) || 100;
        
        this.loadData();
    }

    loadData() {
        try {
            if (fs.existsSync(this.dbPath)) {
                const data = fs.readFileSync(this.dbPath, 'utf8');
                
                if (!data.trim()) {
                    console.warn('Database file is empty, initializing with empty data');
                    this.players = [];
                    this.chatMessages = [];
                    return;
                }
                
                const parsedData = JSON.parse(data);
                
                // Backward compatibility - eğer array ise (eski format)
                if (Array.isArray(parsedData)) {
                    this.players = parsedData;
                    this.chatMessages = [];
                    console.log('Loaded database in legacy format, will upgrade on next save');
                } else {
                    // Yeni format - object with players and chatMessages
                    this.players = parsedData.players || [];
                    this.chatMessages = parsedData.chatMessages || [];
                }
                
                console.log(`Database loaded: ${this.players.length} players, ${this.chatMessages.length} chat messages`);
            } else {
                console.log('Database file not found, creating new database');
                this.players = [];
                this.chatMessages = [];
            }
        } catch (error) {
            console.error('DB Load Error:', error.message);
            console.log('Initializing with empty database due to load error');
            this.players = [];
            this.chatMessages = [];
            
            // Create backup of corrupted file
            if (fs.existsSync(this.dbPath)) {
                try {
                    const backupPath = `${this.dbPath}.corrupted.${Date.now()}`;
                    fs.copyFileSync(this.dbPath, backupPath);
                    console.log(`Corrupted database backed up to: ${backupPath}`);
                } catch (backupError) {
                    console.error('Failed to backup corrupted database:', backupError.message);
                }
            }
        }
    }

    saveData() {
        try {
            const dataToSave = {
                players: this.players,
                chatMessages: this.chatMessages || [],
                lastUpdated: new Date().toISOString()
            };
            fs.writeFileSync(this.dbPath, JSON.stringify(dataToSave, null, 2));
        } catch (error) {
            console.log('DB Save Error:', error.message);
        }
    }

    // Kullanıcı kayıt
    async registerUser(username, email, password) {
        // Input validation
        if (!username || !email || !password) {
            return { data: null, error: 'All fields are required' };
        }

        if (typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
            return { data: null, error: 'Invalid input types' };
        }

        // Kullanıcı adı ve email kontrolü (case insensitive)
        const existingUser = this.players.find(p => 
            p.username.toLowerCase() === username.toLowerCase() || 
            p.email.toLowerCase() === email.toLowerCase()
        );
        
        if (existingUser) {
            return { 
                data: null, 
                error: existingUser.username.toLowerCase() === username.toLowerCase() ? 
                    'Username already exists' : 'Email already exists' 
            };
        }

        try {
            // Şifreyi hash'le
            const hashedPassword = await bcrypt.hash(password, this.bcryptRounds);
            
            const newPlayer = {
                id: Date.now() + Math.random(), // Add randomness to prevent ID collision
                username: username.trim(),
                email: email.toLowerCase().trim(),
                password: hashedPassword,
                score: 0,
                level: 1, // Başlangıç level'ı
                energy: this.initialEnergy,
                lastEnergyUpdate: new Date().toISOString(),
                created_at: new Date().toISOString(),
                // Initialize profile fields
                displayName: username.trim(),
                bio: '',
                avatar: username.charAt(0).toUpperCase(),
                country: '',
                theme: 'cyberpunk',
                totalGames: 0,
                totalPlayTime: 0,
                currentStreak: 0,
                maxStreak: 0,
                achievements: []
            };
            
            this.players.push(newPlayer);
            this.saveData();
            
            // Şifreyi response'dan çıkar
            const { password: _, ...playerData } = newPlayer;
            return { data: playerData, error: null };
        } catch (error) {
            console.error('Registration error:', error);
            return { data: null, error: 'Registration failed' };
        }
    }

    // Kullanıcı giriş
    async loginUser(email, password) {
        // Input validation
        if (!email || !password) {
            return { data: null, error: 'Email and password are required' };
        }

        if (typeof email !== 'string' || typeof password !== 'string') {
            return { data: null, error: 'Invalid input types' };
        }

        // Case insensitive email search
        const user = this.players.find(p => p.email.toLowerCase() === email.toLowerCase());
        
        if (!user) {
            // Use same error message to prevent email enumeration
            return { data: null, error: 'Invalid email or password' };
        }

        try {
            const isValidPassword = await bcrypt.compare(password, user.password);
            
            if (!isValidPassword) {
                return { data: null, error: 'Invalid email or password' };
            }

            // JWT token oluştur
            const token = jwt.sign(
                { 
                    userId: user.id, 
                    username: user.username,
                    email: user.email 
                },
                this.jwtSecret,
                { expiresIn: this.jwtExpiresIn }
            );

            // Update last login time
            user.lastLogin = new Date().toISOString();
            this.saveData();

            // Şifreyi response'dan çıkar
            const { password: _, ...userData } = user;
            return { 
                data: { 
                    user: userData, 
                    token 
                }, 
                error: null 
            };
        } catch (error) {
            console.error('Login error:', error);
            return { data: null, error: 'Login failed' };
        }
    }

    // Token doğrulama
    verifyToken(token) {
        try {
            const decoded = jwt.verify(token, this.jwtSecret);
            return { data: decoded, error: null };
        } catch (error) {
            return { data: null, error: 'Invalid token' };
        }
    }

    // Kullanıcı ekleme/güncelleme (skor ve level için)
    async upsertPlayer(username, score = 0, level = 1, email = '') {
        const existingIndex = this.players.findIndex(p => p.username === username);
        
        if (existingIndex >= 0) {
            let updated = false;
            
            // Skor daha yüksekse güncelle
            if (score > this.players[existingIndex].score) {
                this.players[existingIndex].score = score;
                updated = true;
            }
            
            // Level daha yüksekse güncelle
            if (level > (this.players[existingIndex].level || 1)) {
                this.players[existingIndex].level = level;
                updated = true;
            }
            
            if (updated) {
                this.saveData();
            }
            
            return { data: this.players[existingIndex], error: null };
        } else {
            // Bu fonksiyon artık sadece skor/level güncellemesi için kullanılacak
            // Yeni kullanıcı kaydı registerUser ile yapılmalı
            return { data: null, error: 'User not found' };
        }
    }

    // Enerji güncelleme
    async updatePlayerEnergy(username, energyChange) {
        const existingIndex = this.players.findIndex(p => p.username === username);
        
        if (existingIndex >= 0) {
            const player = this.players[existingIndex];
            
            // Otomatik enerji yenilenmesini hesapla
            const now = new Date();
            const lastUpdate = new Date(player.lastEnergyUpdate || player.created_at);
            const minutesPassed = Math.floor((now - lastUpdate) / (1000 * 60));
            const energyToAdd = Math.floor(minutesPassed / this.energyRegenMinutes);
            
            // Enerji güncelle
            let newEnergy = (player.energy || this.initialEnergy) + energyToAdd + energyChange;
            newEnergy = Math.max(0, Math.min(this.maxEnergy, newEnergy));
            
            this.players[existingIndex].energy = newEnergy;
            this.players[existingIndex].lastEnergyUpdate = now.toISOString();
            this.saveData();
            
            return { 
                data: { 
                    energy: newEnergy, 
                    energyAdded: energyToAdd,
                    nextEnergyIn: this.energyRegenMinutes - (minutesPassed % this.energyRegenMinutes)
                }, 
                error: null 
            };
        }
        
        return { data: null, error: 'Player not found' };
    }

    // Oyuncu enerjisini getir (otomatik yenilenme ile)
    async getPlayerEnergy(username) {
        const result = await this.updatePlayerEnergy(username, 0);
        return result;
    }

    // Kullanıcı bulma
    async findPlayer(username) {
        const player = this.players.find(p => p.username === username);
        return { data: player || null, error: null };
    }

    // Liderlik tablosu
    async getLeaderboard(limit = 10) {
        const sorted = this.players
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(p => ({ username: p.username, score: p.score }));
        return { data: sorted, error: null };
    }

    // Kullanıcı adı kontrolü
    async checkUsername(username) {
        const exists = this.players.some(p => p.username === username);
        return { data: exists ? [{ username }] : [], error: null };
    }

    // Profil güncelleme
    async updateProfile(username, profileData) {
        const existingIndex = this.players.findIndex(p => p.username === username);
        
        if (existingIndex >= 0) {
            const player = this.players[existingIndex];
            
            // Güncellenebilir alanlar
            if (profileData.displayName !== undefined) {
                player.displayName = profileData.displayName;
            }
            if (profileData.bio !== undefined) {
                player.bio = profileData.bio;
            }
            if (profileData.avatar !== undefined) {
                player.avatar = profileData.avatar;
            }
            if (profileData.country !== undefined) {
                player.country = profileData.country;
            }
            if (profileData.theme !== undefined) {
                player.theme = profileData.theme;
            }
            
            player.updated_at = new Date().toISOString();
            this.saveData();
            
            // Şifreyi response'dan çıkar
            const { password, ...playerData } = player;
            return { data: playerData, error: null };
        }
        
        return { data: null, error: 'Player not found' };
    }

    // Oyuncu istatistikleri
    async getPlayerStats(username) {
        const player = this.players.find(p => p.username === username);
        
        if (!player) {
            return { data: null, error: 'Player not found' };
        }

        // Temel istatistikler hesapla
        const stats = {
            totalGames: player.totalGames || 0,
            totalPlayTime: player.totalPlayTime || 0,
            averageTime: player.totalGames > 0 ? Math.round((player.totalPlayTime || 0) / player.totalGames) : 0,
            bestTime: player.bestTime || null,
            currentStreak: player.currentStreak || 0,
            maxStreak: player.maxStreak || 0,
            rank: this.getPlayerRank(username),
            joinDate: player.created_at,
            lastPlayed: player.lastPlayed || null
        };

        return { data: stats, error: null };
    }

    // Oyuncu sıralaması hesapla
    getPlayerRank(username) {
        const sortedPlayers = this.players
            .sort((a, b) => b.score - a.score)
            .map((p, index) => ({ username: p.username, rank: index + 1 }));
        
        const playerRank = sortedPlayers.find(p => p.username === username);
        return playerRank ? playerRank.rank : this.players.length;
    }

    // Oyun istatistiklerini güncelle
    async updateGameStats(username, gameTime, won = true) {
        const existingIndex = this.players.findIndex(p => p.username === username);
        
        if (existingIndex >= 0) {
            const player = this.players[existingIndex];
            
            player.totalGames = (player.totalGames || 0) + 1;
            player.totalPlayTime = (player.totalPlayTime || 0) + gameTime;
            player.lastPlayed = new Date().toISOString();
            
            if (won) {
                player.currentStreak = (player.currentStreak || 0) + 1;
                player.maxStreak = Math.max(player.maxStreak || 0, player.currentStreak);
                
                if (!player.bestTime || gameTime < player.bestTime) {
                    player.bestTime = gameTime;
                }
            } else {
                player.currentStreak = 0;
            }
            
            this.saveData();
            
            // Başarımları kontrol et
            const newAchievements = await this.checkAchievements(username);
            
            return { data: player, error: null, newAchievements };
        }
        
        return { data: null, error: 'Player not found' };
    }

    // Başarım tanımları
    getAchievementDefinitions() {
        return {
            'first_game': {
                id: 'first_game',
                name: 'First Steps',
                description: 'Complete your first game',
                icon: '🎮',
                condition: (player) => (player.totalGames || 0) >= 1,
                points: 10
            },
            'speed_demon': {
                id: 'speed_demon',
                name: 'Speed Demon',
                description: 'Complete a game in under 30 seconds',
                icon: '⚡',
                condition: (player) => (player.bestTime || Infinity) < 30,
                points: 25
            },
            'perfectionist': {
                id: 'perfectionist',
                name: 'Perfectionist',
                description: 'Complete a game in under 15 seconds',
                icon: '💎',
                condition: (player) => (player.bestTime || Infinity) < 15,
                points: 50
            },
            'veteran': {
                id: 'veteran',
                name: 'Veteran Player',
                description: 'Play 10 games',
                icon: '🏆',
                condition: (player) => (player.totalGames || 0) >= 10,
                points: 20
            },
            'dedicated': {
                id: 'dedicated',
                name: 'Dedicated Gamer',
                description: 'Play 50 games',
                icon: '🎯',
                condition: (player) => (player.totalGames || 0) >= 50,
                points: 50
            },
            'legend': {
                id: 'legend',
                name: 'Legend',
                description: 'Play 100 games',
                icon: '👑',
                condition: (player) => (player.totalGames || 0) >= 100,
                points: 100
            },
            'streak_master': {
                id: 'streak_master',
                name: 'Streak Master',
                description: 'Win 5 games in a row',
                icon: '🔥',
                condition: (player) => (player.currentStreak || 0) >= 5,
                points: 30
            },
            'unstoppable': {
                id: 'unstoppable',
                name: 'Unstoppable',
                description: 'Win 10 games in a row',
                icon: '🚀',
                condition: (player) => (player.currentStreak || 0) >= 10,
                points: 75
            },
            'high_scorer': {
                id: 'high_scorer',
                name: 'High Scorer',
                description: 'Reach 500 points',
                icon: '⭐',
                condition: (player) => (player.score || 0) >= 500,
                points: 25
            },
            'champion': {
                id: 'champion',
                name: 'Champion',
                description: 'Reach 1000 points',
                icon: '🏅',
                condition: (player) => (player.score || 0) >= 1000,
                points: 50
            },
            'time_master': {
                id: 'time_master',
                name: 'Time Master',
                description: 'Play for 1 hour total',
                icon: '⏰',
                condition: (player) => (player.totalPlayTime || 0) >= 3600,
                points: 30
            },
            'early_bird': {
                id: 'early_bird',
                name: 'Early Bird',
                description: 'Join the community (automatic)',
                icon: '🐦',
                condition: (player) => true,
                points: 5
            }
        };
    }

    // Başarımları kontrol et
    async checkAchievements(username) {
        const player = this.players.find(p => p.username === username);
        if (!player) return [];

        // Oyuncunun mevcut başarımları
        if (!player.achievements) {
            player.achievements = [];
        }

        const achievements = this.getAchievementDefinitions();
        const newAchievements = [];

        // Her başarımı kontrol et
        for (const [achievementId, achievement] of Object.entries(achievements)) {
            // Eğer oyuncu bu başarımı henüz almamışsa
            if (!player.achievements.includes(achievementId)) {
                // Koşulu kontrol et
                if (achievement.condition(player)) {
                    player.achievements.push(achievementId);
                    newAchievements.push({
                        ...achievement,
                        unlockedAt: new Date().toISOString()
                    });
                }
            }
        }

        if (newAchievements.length > 0) {
            this.saveData();
        }

        return newAchievements;
    }

    // Oyuncunun başarımlarını getir
    async getPlayerAchievements(username) {
        const player = this.players.find(p => p.username === username);
        if (!player) {
            return { data: null, error: 'Player not found' };
        }

        const allAchievements = this.getAchievementDefinitions();
        const playerAchievements = player.achievements || [];

        const achievements = {
            unlocked: [],
            locked: [],
            totalPoints: 0,
            unlockedCount: playerAchievements.length,
            totalCount: Object.keys(allAchievements).length
        };

        // Başarımları kategorize et
        for (const [achievementId, achievement] of Object.entries(allAchievements)) {
            if (playerAchievements.includes(achievementId)) {
                achievements.unlocked.push({
                    ...achievement,
                    progress: 100
                });
                achievements.totalPoints += achievement.points;
            } else {
                // İlerleme hesapla
                let progress = 0;
                switch (achievementId) {
                    case 'veteran':
                        progress = Math.min(100, ((player.totalGames || 0) / 10) * 100);
                        break;
                    case 'dedicated':
                        progress = Math.min(100, ((player.totalGames || 0) / 50) * 100);
                        break;
                    case 'legend':
                        progress = Math.min(100, ((player.totalGames || 0) / 100) * 100);
                        break;
                    case 'high_scorer':
                        progress = Math.min(100, ((player.score || 0) / 500) * 100);
                        break;
                    case 'champion':
                        progress = Math.min(100, ((player.score || 0) / 1000) * 100);
                        break;
                    case 'time_master':
                        progress = Math.min(100, ((player.totalPlayTime || 0) / 3600) * 100);
                        break;
                    case 'streak_master':
                        progress = Math.min(100, ((player.currentStreak || 0) / 5) * 100);
                        break;
                    case 'unstoppable':
                        progress = Math.min(100, ((player.currentStreak || 0) / 10) * 100);
                        break;
                    default:
                        progress = achievement.condition(player) ? 100 : 0;
                }

                achievements.locked.push({
                    ...achievement,
                    progress: Math.round(progress)
                });
            }
        }

        return { data: achievements, error: null };
    }

    // --- CHAT SYSTEM ---
    
    // Chat mesajı kaydetme
    async saveChatMessage(username, message) {
        try {
            if (!this.chatMessages) {
                this.chatMessages = [];
            }

            const chatMessage = {
                id: Date.now() + Math.random(),
                username: username,
                message: message.trim(),
                timestamp: new Date().toISOString(),
                type: username === 'System' ? 'system' : 'user'
            };

            this.chatMessages.push(chatMessage);

            // Son 100 mesajı tut (memory management)
            if (this.chatMessages.length > 100) {
                this.chatMessages = this.chatMessages.slice(-100);
            }

            this.saveData();
            return { data: chatMessage, error: null };

        } catch (error) {
            console.error('Save chat message error:', error);
            return { data: null, error: 'Failed to save message' };
        }
    }

    // Son chat mesajlarını getir
    async getChatMessages(limit = 50) {
        try {
            if (!this.chatMessages) {
                this.chatMessages = [];
            }

            // Son N mesajı döndür
            const messages = this.chatMessages.slice(-limit);
            return { data: messages, error: null };

        } catch (error) {
            console.error('Get chat messages error:', error);
            return { data: [], error: 'Failed to fetch messages' };
        }
    }

    // Chat mesajlarını temizle (admin fonksiyonu)
    async clearChatMessages() {
        try {
            this.chatMessages = [];
            this.saveData();
            return { data: true, error: null };
        } catch (error) {
            console.error('Clear chat messages error:', error);
            return { data: false, error: 'Failed to clear messages' };
        }
    }
}

module.exports = SimpleDB;