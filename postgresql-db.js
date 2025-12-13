const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class PostgreSQLDB {
    constructor() {
        // Render otomatik olarak DATABASE_URL environment variable sağlar
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        
        this.bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
        this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
        this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
        this.maxEnergy = parseInt(process.env.MAX_ENERGY) || 100;
        this.initialEnergy = parseInt(process.env.INITIAL_ENERGY) || 100;
        
        this.initDatabase();
    }

    async initDatabase() {
        try {
            // Test connection
            const client = await this.pool.connect();
            console.log('✅ Connected to PostgreSQL Database');
            client.release();
        } catch (error) {
            console.error('❌ PostgreSQL connection failed:', error.message);
            console.log('📝 Make sure DATABASE_URL is set and database is created');
        }
    }

    // Kullanıcı kayıt
    async registerUser(username, email, password) {
        const client = await this.pool.connect();
        
        try {
            // Input validation
            if (!username || !email || !password) {
                return { data: null, error: 'All fields are required' };
            }

            if (typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
                return { data: null, error: 'Invalid input types' };
            }

            // Check if user exists
            const existingUser = await client.query(
                'SELECT id FROM users WHERE username = $1 OR email = $2',
                [username.toLowerCase(), email.toLowerCase()]
            );
            
            if (existingUser.rows.length > 0) {
                return { data: null, error: 'Username or email already exists' };
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, this.bcryptRounds);
            
            // Insert user
            const result = await client.query(`
                INSERT INTO users (username, email, password, display_name, energy) 
                VALUES ($1, $2, $3, $4, $5) 
                RETURNING id, username, email, display_name, score, energy, created_at
            `, [username, email.toLowerCase(), hashedPassword, username, this.initialEnergy]);
            
            const user = result.rows[0];
            return { data: user, error: null };
            
        } catch (error) {
            console.error('Registration error:', error);
            return { data: null, error: 'Registration failed' };
        } finally {
            client.release();
        }
    }

    // Kullanıcı giriş
    async loginUser(email, password) {
        const client = await this.pool.connect();
        
        try {
            // Input validation
            if (!email || !password) {
                return { data: null, error: 'Email and password are required' };
            }

            if (typeof email !== 'string' || typeof password !== 'string') {
                return { data: null, error: 'Invalid input types' };
            }

            // Find user
            const result = await client.query(
                'SELECT * FROM users WHERE email = $1',
                [email.toLowerCase()]
            );
            
            if (result.rows.length === 0) {
                return { data: null, error: 'Invalid email or password' };
            }

            const user = result.rows[0];
            
            // Verify password
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return { data: null, error: 'Invalid email or password' };
            }

            // Generate JWT token
            const token = jwt.sign(
                { 
                    userId: user.id, 
                    username: user.username,
                    email: user.email 
                },
                this.jwtSecret,
                { expiresIn: this.jwtExpiresIn }
            );

            // Update last login
            await client.query(
                'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
                [user.id]
            );

            // Remove password from response
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
        } finally {
            client.release();
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

    // Skor güncelleme
    async upsertPlayer(username, score) {
        const client = await this.pool.connect();
        
        try {
            const result = await client.query(`
                UPDATE users 
                SET score = GREATEST(score, $2), updated_at = CURRENT_TIMESTAMP
                WHERE username = $1 
                RETURNING *
            `, [username, score]);
            
            if (result.rows.length > 0) {
                const { password, ...user } = result.rows[0];
                return { data: user, error: null };
            }
            
            return { data: null, error: 'User not found' };
            
        } catch (error) {
            console.error('Score update error:', error);
            return { data: null, error: 'Score update failed' };
        } finally {
            client.release();
        }
    }

    // Enerji güncelleme
    async updatePlayerEnergy(username, energyChange) {
        const client = await this.pool.connect();
        
        try {
            // Get current user data
            const userResult = await client.query(
                'SELECT energy, last_energy_update FROM users WHERE username = $1',
                [username]
            );
            
            if (userResult.rows.length === 0) {
                return { data: null, error: 'User not found' };
            }
            
            const user = userResult.rows[0];
            const now = new Date();
            const lastUpdate = new Date(user.last_energy_update);
            const minutesPassed = Math.floor((now - lastUpdate) / (1000 * 60));
            const energyToAdd = Math.floor(minutesPassed / 5); // 1 energy per 5 minutes
            
            // Calculate new energy
            let newEnergy = (user.energy || this.initialEnergy) + energyToAdd + energyChange;
            newEnergy = Math.max(0, Math.min(this.maxEnergy, newEnergy));
            
            // Update user energy
            await client.query(`
                UPDATE users 
                SET energy = $2, last_energy_update = CURRENT_TIMESTAMP 
                WHERE username = $1
            `, [username, newEnergy]);
            
            return { 
                data: { 
                    energy: newEnergy, 
                    energyAdded: energyToAdd,
                    nextEnergyIn: 5 - (minutesPassed % 5)
                }, 
                error: null 
            };
            
        } catch (error) {
            console.error('Energy update error:', error);
            return { data: null, error: 'Energy update failed' };
        } finally {
            client.release();
        }
    }

    // Enerji kontrol
    async getPlayerEnergy(username) {
        return await this.updatePlayerEnergy(username, 0);
    }

    // Kullanıcı bulma
    async findPlayer(username) {
        const client = await this.pool.connect();
        
        try {
            const result = await client.query(
                'SELECT * FROM users WHERE username = $1',
                [username]
            );
            
            if (result.rows.length > 0) {
                const { password, ...user } = result.rows[0];
                return { data: user, error: null };
            }
            
            return { data: null, error: null };
            
        } catch (error) {
            console.error('Find player error:', error);
            return { data: null, error: 'Database error' };
        } finally {
            client.release();
        }
    }

    // Liderlik tablosu
    async getLeaderboard(limit = 10) {
        const client = await this.pool.connect();
        
        try {
            const result = await client.query(`
                SELECT username, display_name, score 
                FROM users 
                WHERE score > 0
                ORDER BY score DESC 
                LIMIT $1
            `, [limit]);
            
            return { data: result.rows, error: null };
            
        } catch (error) {
            console.error('Leaderboard error:', error);
            return { data: [], error: 'Leaderboard fetch failed' };
        } finally {
            client.release();
        }
    }

    // Kullanıcı adı kontrolü
    async checkUsername(username) {
        const client = await this.pool.connect();
        
        try {
            const result = await client.query(
                'SELECT username FROM users WHERE username = $1',
                [username]
            );
            
            return { data: result.rows, error: null };
            
        } catch (error) {
            console.error('Username check error:', error);
            return { data: [], error: 'Username check failed' };
        } finally {
            client.release();
        }
    }

    // Profil güncelleme
    async updateProfile(username, profileData) {
        const client = await this.pool.connect();
        
        try {
            const updates = [];
            const values = [];
            let paramCount = 1;
            
            if (profileData.displayName !== undefined) {
                updates.push(`display_name = $${paramCount++}`);
                values.push(profileData.displayName);
            }
            if (profileData.bio !== undefined) {
                updates.push(`bio = $${paramCount++}`);
                values.push(profileData.bio);
            }
            if (profileData.avatar !== undefined) {
                updates.push(`avatar = $${paramCount++}`);
                values.push(profileData.avatar);
            }
            if (profileData.country !== undefined) {
                updates.push(`country = $${paramCount++}`);
                values.push(profileData.country);
            }
            if (profileData.theme !== undefined) {
                updates.push(`theme = $${paramCount++}`);
                values.push(profileData.theme);
            }
            
            if (updates.length === 0) {
                return { data: null, error: 'No updates provided' };
            }
            
            updates.push(`updated_at = CURRENT_TIMESTAMP`);
            values.push(username);
            
            const query = `
                UPDATE users 
                SET ${updates.join(', ')} 
                WHERE username = $${paramCount}
                RETURNING *
            `;
            
            const result = await client.query(query, values);
            
            if (result.rows.length > 0) {
                const { password, ...user } = result.rows[0];
                return { data: user, error: null };
            }
            
            return { data: null, error: 'User not found' };
            
        } catch (error) {
            console.error('Profile update error:', error);
            return { data: null, error: 'Profile update failed' };
        } finally {
            client.release();
        }
    }

    // Kullanıcı istatistikleri
    async getPlayerStats(username) {
        const client = await this.pool.connect();
        
        try {
            const result = await client.query(`
                SELECT 
                    u.*,
                    (SELECT COUNT(*) FROM users WHERE score > u.score) + 1 as rank
                FROM users u 
                WHERE u.username = $1
            `, [username]);
            
            if (result.rows.length === 0) {
                return { data: null, error: 'User not found' };
            }
            
            const user = result.rows[0];
            
            const stats = {
                totalGames: user.total_games || 0,
                totalPlayTime: user.total_play_time || 0,
                averageTime: user.total_games > 0 ? Math.round(user.total_play_time / user.total_games) : 0,
                bestTime: user.best_time || null,
                currentStreak: user.current_streak || 0,
                maxStreak: user.max_streak || 0,
                rank: user.rank,
                joinDate: user.created_at,
                lastPlayed: user.last_played
            };
            
            return { data: stats, error: null };
            
        } catch (error) {
            console.error('Get stats error:', error);
            return { data: null, error: 'Failed to fetch stats' };
        } finally {
            client.release();
        }
    }

    // Oyun istatistikleri güncelleme
    async updateGameStats(username, gameTime, won = true) {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Update user stats
            const updateQuery = won ? `
                UPDATE users SET 
                    total_games = COALESCE(total_games, 0) + 1,
                    total_play_time = COALESCE(total_play_time, 0) + $2,
                    current_streak = COALESCE(current_streak, 0) + 1,
                    max_streak = GREATEST(COALESCE(max_streak, 0), COALESCE(current_streak, 0) + 1),
                    best_time = CASE 
                        WHEN best_time IS NULL OR $2 < best_time THEN $2 
                        ELSE best_time 
                    END,
                    last_played = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE username = $1
                RETURNING *
            ` : `
                UPDATE users SET 
                    total_games = COALESCE(total_games, 0) + 1,
                    total_play_time = COALESCE(total_play_time, 0) + $2,
                    current_streak = 0,
                    last_played = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE username = $1
                RETURNING *
            `;
            
            const result = await client.query(updateQuery, [username, gameTime]);
            
            // Check for new achievements (simplified for now)
            const newAchievements = await this.checkAchievements(client, username);
            
            await client.query('COMMIT');
            
            if (result.rows.length > 0) {
                const { password, ...user } = result.rows[0];
                return { data: user, error: null, newAchievements };
            }
            
            return { data: null, error: 'User not found' };
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Game stats update error:', error);
            return { data: null, error: 'Stats update failed' };
        } finally {
            client.release();
        }
    }

    // Basit başarım kontrolü
    async checkAchievements(client, username) {
        try {
            // Şimdilik basit achievement sistemi
            // Gelecekte daha detaylı achievement tablosu eklenebilir
            return [];
        } catch (error) {
            console.error('Achievement check error:', error);
            return [];
        }
    }

    // Başarımları getir (basit versiyon)
    async getPlayerAchievements(username) {
        try {
            // Şimdilik boş achievement sistemi
            const achievements = {
                unlocked: [],
                locked: [],
                totalPoints: 0,
                unlockedCount: 0,
                totalCount: 0
            };
            
            return { data: achievements, error: null };
        } catch (error) {
            console.error('Get achievements error:', error);
            return { data: null, error: 'Failed to fetch achievements' };
        }
    }
}

module.exports = PostgreSQLDB;