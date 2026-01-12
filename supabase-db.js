import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

class SupabaseDB {
    constructor() {
        // Supabase configuration
        this.supabaseUrl = process.env.SUPABASE_URL;
        this.supabaseKey = process.env.SUPABASE_ANON_KEY;

        if (!this.supabaseUrl || !this.supabaseKey) {
            console.warn('⚠️  Supabase credentials not found, falling back to JSON database');
            return null;
        }

        this.supabase = createClient(this.supabaseUrl, this.supabaseKey);

        this.bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
        this.jwtSecret = process.env.JWT_SECRET;
        this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';

        // JWT Secret validation
        if (!this.jwtSecret) {
            if (process.env.NODE_ENV === 'production') {
                throw new Error('❌ CRITICAL: JWT_SECRET must be set in production!');
            } else {
                console.warn('⚠️  WARNING: JWT_SECRET not found, using insecure default for development only!');
                this.jwtSecret = 'dev-secret-key-do-not-use-in-prod';
            }
        }
        this.maxEnergy = parseInt(process.env.MAX_ENERGY) || 100;
        this.initialEnergy = parseInt(process.env.INITIAL_ENERGY) || 100;

        this.initDatabase();
    }

    async initDatabase() {
        try {
            // Test connection with a simple query
            const { error } = await this.supabase.from('users').select('count').limit(1);
            if (error) {
                throw new Error(`Supabase connection test failed: ${error.message}`);
            }

            console.log('✅ Connected to Supabase Database');
            return true;
        } catch (error) {
            console.error('❌ Supabase connection failed:', error.message);
            throw error; // Re-throw to allow fallback handling
        }
    }

    // Kullanıcı kayıt
    async registerUser(username, email, password) {
        try {
            // Input validation
            if (!username || !email || !password) {
                return { data: null, error: 'All fields are required' };
            }

            if (typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
                return { data: null, error: 'Invalid input types' };
            }

            // Check if user exists
            const { data: existingUser } = await this.supabase
                .from('users')
                .select('id')
                .or(`username.eq.${username},email.eq.${email.toLowerCase()}`)
                .limit(1);

            if (existingUser && existingUser.length > 0) {
                return { data: null, error: 'Username or email already exists' };
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, this.bcryptRounds);

            // Insert user
            const { data: newUser, error } = await this.supabase
                .from('users')
                .insert({
                    username: username.trim(),
                    email: email.toLowerCase().trim(),
                    password: hashedPassword,
                    display_name: username.trim(),
                    energy: this.initialEnergy,
                    level: 1
                })
                .select()
                .single();

            if (error) throw error;

            // Remove password from response
            const { password: _, ...userData } = newUser;
            return { data: userData, error: null };

        } catch (error) {
            console.error('Registration error:', error);
            return { data: null, error: 'Registration failed' };
        }
    }

    // Kullanıcı giriş
    async loginUser(email, password) {
        try {
            // Input validation
            if (!email || !password) {
                return { data: null, error: 'Email and password are required' };
            }

            if (typeof email !== 'string' || typeof password !== 'string') {
                return { data: null, error: 'Invalid input types' };
            }

            // Find user
            const { data: user, error } = await this.supabase
                .from('users')
                .select('*')
                .eq('email', email.toLowerCase())
                .single();

            if (error || !user) {
                return { data: null, error: 'Invalid email or password' };
            }

            // Verify password
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return { data: null, error: 'Invalid email or password' };
            }

            // Check if banned
            if (user.banned) {
                return { data: null, error: 'Account is banned' };
            }

            // Generate JWT token
            const token = jwt.sign(
                {
                    userId: user.id,
                    username: user.username,
                    email: user.email,
                    isAdmin: user.is_admin || false
                },
                this.jwtSecret,
                { expiresIn: this.jwtExpiresIn }
            );

            // Update last login
            await this.supabase
                .from('users')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', user.id);

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
        }
    }

    // Şifre sıfırlama tokeni oluştur
    async createPasswordResetToken(email) {
        try {
            // Find user
            const { data: user, error } = await this.supabase
                .from('users')
                .select('id, username')
                .eq('email', email.toLowerCase())
                .maybeSingle();

            if (error || !user) {
                // Return generic success to prevent email enumeration
                return { data: true, error: null };
            }

            // Generate random token
            const resetToken = crypto.randomBytes(32).toString('hex');
            const hashedToken = crypto
                .createHash('sha256')
                .update(resetToken)
                .digest('hex');

            // Set expiration (1 hour)
            const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();

            // Save to DB
            const { error: updateError } = await this.supabase
                .from('users')
                .update({
                    reset_token: hashedToken,
                    reset_token_expires: expires
                })
                .eq('id', user.id);

            if (updateError) throw updateError;

            return {
                data: {
                    token: resetToken,
                    username: user.username
                },
                error: null
            };

        } catch (error) {
            console.error('Create reset token error:', error);
            return { data: null, error: 'Failed to create reset token' };
        }
    }

    // Token ile şifre sıfırla
    async resetPasswordWithToken(token, newPassword) {
        try {
            // Hash token to compare with DB
            const hashedToken = crypto
                .createHash('sha256')
                .update(token)
                .digest('hex');

            // Find user with valid token
            const { data: user, error } = await this.supabase
                .from('users')
                .select('id, username')
                .eq('reset_token', hashedToken)
                .gt('reset_token_expires', new Date().toISOString())
                .maybeSingle();

            if (error || !user) {
                return { data: null, error: 'Invalid or expired token' };
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, this.bcryptRounds);

            // Update user (clear token)
            const { error: updateError } = await this.supabase
                .from('users')
                .update({
                    password: hashedPassword,
                    reset_token: null,
                    reset_token_expires: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (updateError) throw updateError;

            return { data: true, error: null };

        } catch (error) {
            console.error('Reset password error:', error);
            return { data: null, error: 'Failed to reset password' };
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

    // Skor ve level güncelleme
    async upsertPlayer(username, score = 0, level = 1) {
        try {
            const { data: user, error } = await this.supabase
                .from('users')
                .update({
                    score: score,
                    level: level,
                    updated_at: new Date().toISOString()
                })
                .eq('username', username)
                .select()
                .maybeSingle();

            if (error) throw error;
            if (!user) {
                console.warn(`UpsertPlayer: User '${username}' not found.`);
                return { data: null, error: 'User not found' };
            }

            const { password, ...userData } = user;
            return { data: userData, error: null };

        } catch (error) {
            console.error('Score update error:', error);
            return { data: null, error: 'Score update failed' };
        }
    }

    // Enerji güncelleme
    async updatePlayerEnergy(username, energyChange) {
        try {
            // Get current user data
            const { data: user, error: userError } = await this.supabase
                .from('users')
                .select('id, energy, last_energy_update')
                .eq('username', username)
                .single();

            if (userError || !user) {
                return { data: null, error: 'User not found' };
            }

            // Calculate energy regeneration
            const now = new Date();
            const lastUpdate = new Date(user.last_energy_update);
            const minutesPassed = Math.floor((now - lastUpdate) / (1000 * 60));
            const energyToAdd = Math.floor(minutesPassed / 5); // 1 energy per 5 minutes

            // Calculate new energy
            let newEnergy = (user.energy || this.initialEnergy) + energyToAdd + energyChange;
            newEnergy = Math.max(0, Math.min(this.maxEnergy, newEnergy));

            // Update user energy
            const { error: updateError } = await this.supabase
                .from('users')
                .update({
                    energy: newEnergy,
                    last_energy_update: now.toISOString()
                })
                .eq('id', user.id);

            if (updateError) throw updateError;

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
        }
    }

    // Enerji kontrol
    async getPlayerEnergy(username) {
        return await this.updatePlayerEnergy(username, 0);
    }

    // Kullanıcı bulma
    async findPlayer(username) {
        try {
            const { data: user, error } = await this.supabase
                .from('users')
                .select('*')
                .eq('username', username)
                .maybeSingle();

            if (error) throw error;

            if (user) {
                const { password, ...userData } = user;
                return { data: userData, error: null };
            }

            return { data: null, error: null };

        } catch (error) {
            console.error('Find player error:', error);
            return { data: null, error: 'Database error' };
        }
    }

    // Liderlik tablosu
    async getLeaderboard(limit = 10) {
        try {
            const { data, error } = await this.supabase
                .from('leaderboard')
                .select('username, display_name, score, level, rank')
                .limit(limit);

            if (error) throw error;

            return { data: data || [], error: null };

        } catch (error) {
            console.error('Leaderboard error:', error);
            return { data: [], error: 'Leaderboard fetch failed' };
        }
    }

    // Kullanıcı adı kontrolü
    async checkUsername(username) {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('username')
                .eq('username', username);

            if (error) throw error;

            return { data: data || [], error: null };

        } catch (error) {
            console.error('Username check error:', error);
            return { data: [], error: 'Username check failed' };
        }
    }

    // Profil güncelleme
    async updateProfile(username, profileData) {
        try {
            const updateData = { updated_at: new Date().toISOString() };

            if (profileData.displayName !== undefined) updateData.display_name = profileData.displayName;
            if (profileData.bio !== undefined) updateData.bio = profileData.bio;
            if (profileData.avatar !== undefined) updateData.avatar = profileData.avatar;
            if (profileData.country !== undefined) updateData.country = profileData.country;
            if (profileData.theme !== undefined) updateData.theme = profileData.theme;

            const { data: user, error } = await this.supabase
                .from('users')
                .update(updateData)
                .eq('username', username)
                .select()
                .maybeSingle();

            if (error) throw error;
            if (!user) return { data: null, error: 'User not found' };

            const { password, ...userData } = user;
            return { data: userData, error: null };

        } catch (error) {
            console.error('Profile update error:', error);
            return { data: null, error: 'Profile update failed' };
        }
    }

    // Kullanıcı istatistikleri
    async getPlayerStats(username) {
        try {
            const { data: user, error } = await this.supabase
                .from('users')
                .select(`
                    *,
                    rank:leaderboard!inner(rank)
                `)
                .eq('username', username)
                .single();

            if (error) throw error;

            const stats = {
                totalGames: user.total_games || 0,
                totalPlayTime: user.total_play_time || 0,
                averageTime: user.total_games > 0 ? Math.round(user.total_play_time / user.total_games) : 0,
                bestTime: user.best_time || null,
                currentStreak: user.current_streak || 0,
                maxStreak: user.max_streak || 0,
                rank: (user.rank && user.rank[0] && user.rank[0].rank) || 999,
                joinDate: user.created_at,
                lastPlayed: user.last_played
            };

            return { data: stats, error: null };

        } catch (error) {
            console.error('Get stats error:', error);
            return { data: null, error: 'Failed to fetch stats' };
        }
    }

    // Oyun istatistikleri güncelleme
    async updateGameStats(username, gameTime, won = true) {
        try {
            // Get user ID first
            const { data: user, error: userError } = await this.supabase
                .from('users')
                .select('id, total_games, total_play_time, current_streak, max_streak, best_time')
                .eq('username', username)
                .maybeSingle();

            if (userError) throw userError;
            if (!user) return { data: null, error: 'User not found' };

            // Calculate new stats
            const newTotalGames = (user.total_games || 0) + 1;
            const newTotalPlayTime = (user.total_play_time || 0) + gameTime;
            const newCurrentStreak = won ? (user.current_streak || 0) + 1 : 0;
            const newMaxStreak = Math.max(user.max_streak || 0, newCurrentStreak);
            const newBestTime = won && (!user.best_time || gameTime < user.best_time) ? gameTime : user.best_time;

            // Update user stats
            const { data: updatedUser, error: updateError } = await this.supabase
                .from('users')
                .update({
                    total_games: newTotalGames,
                    total_play_time: newTotalPlayTime,
                    current_streak: newCurrentStreak,
                    max_streak: newMaxStreak,
                    best_time: newBestTime,
                    last_played: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id)
                .select()
                .maybeSingle();

            if (updateError) throw updateError;
            if (!updatedUser) return { data: null, error: 'User update failed' };

            // Insert game session record
            await this.supabase
                .from('game_sessions')
                .insert({
                    user_id: user.id,
                    score: 0, // Will be updated separately
                    level_reached: 1, // Will be updated separately
                    game_time: gameTime,
                    won: won
                });

            // Check for new achievements (simplified for now)
            const newAchievements = await this.checkAchievements(user.id);

            const { password, ...userData } = updatedUser;
            return { data: userData, error: null, newAchievements };

        } catch (error) {
            console.error('Game stats update error:', error);
            return { data: null, error: 'Stats update failed' };
        }
    }

    // Basit başarım kontrolü
    // Basit başarım kontrolü
    async checkAchievements(userId) {
        try {
            // 1. Get user stats
            const { data: user, error: userError } = await this.supabase
                .from('users')
                .select('id, total_games, score, best_time, current_streak, total_play_time')
                .eq('id', userId)
                .maybeSingle();

            if (userError) throw userError;
            if (!user) return []; // User not found

            // 2. Get all achievements and user's unlocked achievements
            const { data: allAchievements, error: achError } = await this.supabase
                .from('achievements')
                .select('*');

            if (achError) throw achError;

            const { data: userAchievements, error: uaError } = await this.supabase
                .from('user_achievements')
                .select('achievement_id')
                .eq('user_id', userId);

            if (uaError) throw uaError;

            const unlockedIds = new Set((userAchievements || []).map(ua => ua.achievement_id));
            const newAchievements = [];

            // 3. Check for new unlocks
            for (const achievement of (allAchievements || [])) {
                if (unlockedIds.has(achievement.id)) continue;

                if (this.checkAchievementCondition(achievement, user)) {
                    // Unlock!
                    await this.unlockAchievement(userId, achievement.id);
                    newAchievements.push(achievement);
                }
            }

            return newAchievements;

        } catch (error) {
            console.error('Achievement check error:', error);
            return [];
        }
    }

    // Başarımları getir
    async getPlayerAchievements(username) {
        try {
            // Get user ID
            const { data: user, error: userError } = await this.supabase
                .from('users')
                .select('id, total_games, score, best_time, current_streak, total_play_time')
                .eq('username', username)
                .maybeSingle();

            if (userError) throw userError;
            if (!user) return { data: null, error: 'User not found' };

            // Get all achievements
            const { data: allAchievements, error: achievementsError } = await this.supabase
                .from('achievements')
                .select('*');

            if (achievementsError) throw achievementsError;

            // Get user's unlocked achievements
            const { data: userAchievements, error: userAchError } = await this.supabase
                .from('user_achievements')
                .select('achievement_id, unlocked_at')
                .eq('user_id', user.id);

            if (userAchError) throw userAchError;

            const unlockedIds = (userAchievements || []).map(ua => ua.achievement_id);

            // Separate unlocked and locked achievements
            const unlocked = [];
            const locked = [];
            let totalPoints = 0;

            for (const achievement of (allAchievements || [])) {
                const isUnlocked = unlockedIds.includes(achievement.id);

                if (isUnlocked) {
                    const userAchievement = userAchievements.find(ua => ua.achievement_id === achievement.id);
                    unlocked.push({
                        ...achievement,
                        unlockedAt: userAchievement ? userAchievement.unlocked_at : null
                    });
                    totalPoints += achievement.points || 0;
                } else {
                    // Check if achievement should be unlocked
                    const shouldUnlock = this.checkAchievementCondition(achievement, user);
                    if (shouldUnlock) {
                        // Auto-unlock achievement
                        await this.unlockAchievement(user.id, achievement.id);
                        unlocked.push({
                            ...achievement,
                            unlockedAt: new Date().toISOString()
                        });
                        totalPoints += achievement.points || 0;
                    } else {
                        locked.push(achievement);
                    }
                }
            }

            const achievements = {
                unlocked,
                locked,
                totalPoints,
                unlockedCount: unlocked.length,
                totalCount: (allAchievements || []).length
            };

            return { data: achievements, error: null };
        } catch (error) {
            console.error('Get achievements error:', error);
            return { data: null, error: 'Failed to fetch achievements' };
        }
    }

    // Achievement koşulunu kontrol et
    checkAchievementCondition(achievement, userStats) {
        switch (achievement.condition_type) {
            case 'total_games':
                return (userStats.total_games || 0) >= achievement.condition_value;
            case 'score':
                return (userStats.score || 0) >= achievement.condition_value;
            case 'best_time':
                return !!(userStats.best_time && userStats.best_time <= achievement.condition_value);
            case 'current_streak':
                return (userStats.current_streak || 0) >= achievement.condition_value;
            case 'total_play_time':
                return (userStats.total_play_time || 0) >= achievement.condition_value;
            case 'created':
                return true; // Early bird achievement - always unlocked for existing users
            default:
                return false;
        }
    }

    // Achievement unlock
    async unlockAchievement(userId, achievementId) {
        try {
            await this.supabase
                .from('user_achievements')
                .insert({
                    user_id: userId,
                    achievement_id: achievementId
                })
                .select() // Prevent returning nothing error if needed
                .maybeSingle();
        } catch (error) {
            // Ignore duplicate key errors (already unlocked)
            if (error.code !== '23505') {
                console.error('Unlock achievement error:', error);
            }
        }
    }

    // --- CHAT SYSTEM ---

    // Chat mesajı kaydetme
    async saveChatMessage(username, message) {
        try {
            // Get user ID
            const { data: user } = await this.supabase
                .from('users')
                .select('id')
                .eq('username', username)
                .single();

            const chatMessage = {
                user_id: user ? user.id : null,
                username: username,
                message: message.trim(),
                message_type: username === 'System' ? 'system' : 'user'
            };

            const { data, error } = await this.supabase
                .from('chat_messages')
                .insert(chatMessage)
                .select()
                .single();

            if (error) throw error;

            return { data, error: null };

        } catch (error) {
            console.error('Save chat message error:', error);
            return { data: null, error: 'Failed to save message' };
        }
    }

    // Son chat mesajlarını getir
    async getChatMessages(limit = 50) {
        try {
            const { data, error } = await this.supabase
                .from('chat_messages')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            // Reverse to show oldest first
            return { data: (data || []).reverse(), error: null };

        } catch (error) {
            console.error('Get chat messages error:', error);
            return { data: [], error: 'Failed to fetch messages' };
        }
    }

    // Chat mesajlarını temizle (admin fonksiyonu)
    async clearChatMessages() {
        try {
            const { error } = await this.supabase
                .from('chat_messages')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

            if (error) throw error;

            return { data: true, error: null };
        } catch (error) {
            console.error('Clear chat messages error:', error);
            return { data: false, error: 'Failed to clear messages' };
        }
    }

    // --- Admin Methods ---

    async getAllUsers(page = 1, limit = 20, search = '') {
        try {
            let query = this.supabase
                .from('users')
                .select('id, username, email, is_admin, banned, score, level, created_at, last_played', { count: 'exact' });

            if (search) {
                query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%`);
            }

            const from = (page - 1) * limit;
            const to = from + limit - 1;

            const { data, error, count } = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;
            return { data: { users: data, total: count }, error: null };
        } catch (error) {
            console.error('Get all users error:', error);
            return { data: null, error: 'Failed to fetch users' };
        }
    }

    async toggleBanUser(userId, banStatus) {
        try {
            const { error } = await this.supabase
                .from('users')
                .update({ banned: banStatus })
                .eq('id', userId);

            if (error) throw error;
            return { data: true, error: null };
        } catch (error) {
            console.error('Ban user error:', error);
            return { data: null, error: 'Failed to update user ban status' };
        }
    }

    async getSystemStats() {
        try {
            const { count: userCount, error: userError } = await this.supabase
                .from('users')
                .select('*', { count: 'exact', head: true });

            const { count: gameCount, error: gameError } = await this.supabase
                .from('game_sessions')
                .select('*', { count: 'exact', head: true });

            if (userError || gameError) throw new Error('Stats fetch failed');

            return {
                data: {
                    totalUsers: userCount,
                    totalGames: gameCount
                },
                error: null
            };
        } catch (error) {
            console.error('System stats error:', error);
            return { data: null, error: 'Failed to get system stats' };
        }
    }
}

export default SupabaseDB;