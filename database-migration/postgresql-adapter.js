const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class PostgreSQLAdapter {
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
            // Use PostgreSQL function to calculate energy
            const result = await client.query(`
                SELECT * FROM calculate_energy((SELECT id FROM users WHERE username = $1))
            `, [username]);
            
            if (result.rows.length > 0) {
                const energyData = result.rows[0];
                
                // Apply energy change
                const newEnergy = Math.max(0, Math.min(this.maxEnergy, energyData.current_energy + energyChange));
                
                if (energyChange !== 0) {
                    await client.query(`
                        UPDATE users 
                        SET energy = $2, last_energy_update = CURRENT_TIMESTAMP 
                        WHERE username = $1
                    `, [username, newEnergy]);
                }
                
                return { 
                    data: { 
                        energy: newEnergy, 
                        energyAdded: energyData.energy_added,
                        nextEnergyIn: energyData.next_energy_in
                    }, 
                    error: null 
                };
            }
            
            return { data: null, error: 'User not found' };
            
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
                SELECT username, display_name, score, rank 
                FROM leaderboard 
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

    // Oyun istatistikleri güncelleme
    async updateGameStats(username, gameTime, won = true) {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Insert game session
            await client.query(`
                INSERT INTO game_sessions (user_id, game_time, won) 
                VALUES ((SELECT id FROM users WHERE username = $1), $2, $3)
            `, [username, gameTime, won]);
            
            // Update user stats
            const updateQuery = won ? `
                UPDATE users SET 
                    total_games = total_games + 1,
                    total_play_time = total_play_time + $2,
                    current_streak = current_streak + 1,
                    max_streak = GREATEST(max_streak, current_streak + 1),
                    best_time = CASE 
                        WHEN best_time IS NULL OR $2 < best_time THEN $2 
                        ELSE best_time 
                    END,
                    last_played = CURRENT_TIMESTAMP
                WHERE username = $1
                RETURNING *
            ` : `
                UPDATE users SET 
                    total_games = total_games + 1,
                    total_play_time = total_play_time + $2,
                    current_streak = 0,
                    last_played = CURRENT_TIMESTAMP
                WHERE username = $1
                RETURNING *
            `;
            
            const result = await client.query(updateQuery, [username, gameTime]);
            
            // Check for new achievements
            const newAchievements = await this.checkAchievements(client, username);
            
            await client.query('COMMIT');
            
            const { password, ...user } = result.rows[0];
            return { data: user, error: null, newAchievements };
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Game stats update error:', error);
            return { data: null, error: 'Stats update failed' };
        } finally {
            client.release();
        }
    }

    // Başarımları kontrol et
    async checkAchievements(client, username) {
        try {
            // Get user stats
            const userResult = await client.query(
                'SELECT * FROM users WHERE username = $1',
                [username]
            );
            
            if (userResult.rows.length === 0) return [];
            
            const user = userResult.rows[0];
            
            // Get achievements user doesn't have
            const achievementsResult = await client.query(`
                SELECT a.* FROM achievements a
                WHERE a.id NOT IN (
                    SELECT ua.achievement_id 
                    FROM user_achievements ua 
                    WHERE ua.user_id = $1
                )
            `, [user.id]);
            
            const newAchievements = [];
            
            for (const achievement of achievementsResult.rows) {
                let unlocked = false;
                
                switch (achievement.condition_type) {
                    case 'total_games':
                        unlocked = user.total_games >= achievement.condition_value;
                        break;
                    case 'best_time':
                        unlocked = user.best_time && user.best_time <= achievement.condition_value;
                        break;
                    case 'score':
                        unlocked = user.score >= achievement.condition_value;
                        break;
                    case 'current_streak':
                        unlocked = user.current_streak >= achievement.condition_value;
                        break;
                    case 'total_play_time':
                        unlocked = user.total_play_time >= achievement.condition_value;
                        break;
                    case 'created':
                        unlocked = true; // Early bird achievement
                        break;
                }
                
                if (unlocked) {
                    // Insert user achievement
                    await client.query(`
                        INSERT INTO user_achievements (user_id, achievement_id) 
                        VALUES ($1, $2)
                    `, [user.id, achievement.id]);
                    
                    newAchievements.push({
                        ...achievement,
                        unlockedAt: new Date().toISOString()
                    });
                }
            }
            
            return newAchievements;
            
        } catch (error) {
            console.error('Achievement check error:', error);
            return [];
        }
    }

    // Kullanıcı başarımları
    async getPlayerAchievements(username) {
        const client = await this.pool.connect();
        
        try {
            const userResult = await client.query(
                'SELECT id FROM users WHERE username = $1',
                [username]
            );
            
            if (userResult.rows.length === 0) {
                return { data: null, error: 'User not found' };
            }
            
            const userId = userResult.rows[0].id;
            
            // Get all achievements with user progress
            const result = await client.query(`
                SELECT 
                    a.*,
                    ua.unlocked_at,
                    CASE WHEN ua.user_id IS NOT NULL THEN true ELSE false END as unlocked
                FROM achievements a
                LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
                ORDER BY unlocked DESC, a.points DESC
            `, [userId]);
            
            const achievements = {
                unlocked: [],
                locked: [],
                totalPoints: 0,
                unlockedCount: 0,
                totalCount: result.rows.length
            };
            
            result.rows.forEach(achievement => {
                if (achievement.unlocked) {
                    achievements.unlocked.push(achievement);
                    achievements.totalPoints += achievement.points;
                    achievements.unlockedCount++;
                } else {
                    achievements.locked.push({
                        ...achievement,
                        progress: 0 // TODO: Calculate progress based on user stats
                    });
                }
            });
            
            return { data: achievements, error: null };
            
        } catch (error) {
            console.error('Get achievements error:', error);
            return { data: null, error: 'Failed to fetch achievements' };
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
}

module.exports = PostgreSQLAdapter;