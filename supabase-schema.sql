-- CipherNode Game - Supabase Database Schema
-- Run this in Supabase SQL Editor

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret-here';

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username VARCHAR(30) UNIQUE NOT NULL,
    email VARCHAR(254) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    display_name VARCHAR(50),
    bio TEXT,
    avatar VARCHAR(10) DEFAULT '👤',
    country VARCHAR(5),
    theme VARCHAR(20) DEFAULT 'cyberpunk',
    score INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    energy INTEGER DEFAULT 100,
    last_energy_update TIMESTAMPTZ DEFAULT NOW(),
    total_games INTEGER DEFAULT 0,
    total_play_time INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    max_streak INTEGER DEFAULT 0,
    best_time INTEGER,
    last_played TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(30) NOT NULL,
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'user', -- 'user' or 'system'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game sessions table (for detailed analytics)
CREATE TABLE IF NOT EXISTS game_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    level_reached INTEGER NOT NULL,
    game_time INTEGER NOT NULL, -- in seconds
    won BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Achievements table
CREATE TABLE IF NOT EXISTS achievements (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(10) NOT NULL,
    points INTEGER DEFAULT 0,
    condition_type VARCHAR(50) NOT NULL,
    condition_value INTEGER
);

-- User achievements junction table
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    achievement_id VARCHAR(50) REFERENCES achievements(id),
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_score ON users(score DESC);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_username ON chat_messages(username);
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_created_at ON game_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);

-- Leaderboard view
CREATE OR REPLACE VIEW leaderboard AS
SELECT 
    username,
    display_name,
    score,
    level,
    total_games,
    best_time,
    current_streak,
    ROW_NUMBER() OVER (ORDER BY score DESC) as rank
FROM users 
WHERE score > 0
ORDER BY score DESC;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate energy regeneration
CREATE OR REPLACE FUNCTION calculate_energy(user_uuid UUID)
RETURNS TABLE(current_energy INTEGER, energy_added INTEGER, next_energy_in INTEGER) AS $$
DECLARE
    user_record RECORD;
    minutes_passed INTEGER;
    energy_to_add INTEGER;
    new_energy INTEGER;
BEGIN
    SELECT energy, last_energy_update INTO user_record 
    FROM users WHERE id = user_uuid;
    
    IF user_record IS NULL THEN
        RETURN;
    END IF;
    
    minutes_passed := EXTRACT(EPOCH FROM (NOW() - user_record.last_energy_update)) / 60;
    energy_to_add := FLOOR(minutes_passed / 5); -- 1 energy per 5 minutes
    new_energy := LEAST(100, user_record.energy + energy_to_add);
    
    -- Update user energy if changed
    IF energy_to_add > 0 THEN
        UPDATE users 
        SET energy = new_energy, last_energy_update = NOW() 
        WHERE id = user_uuid;
    END IF;
    
    RETURN QUERY SELECT 
        new_energy,
        energy_to_add,
        (5 - (minutes_passed % 5))::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- Insert default achievements
INSERT INTO achievements (id, name, description, icon, points, condition_type, condition_value) VALUES
('first_game', 'First Steps', 'Complete your first game', '🎮', 10, 'total_games', 1),
('speed_demon', 'Speed Demon', 'Complete a game in under 30 seconds', '⚡', 25, 'best_time', 30),
('perfectionist', 'Perfectionist', 'Complete a game in under 15 seconds', '💎', 50, 'best_time', 15),
('veteran', 'Veteran Player', 'Play 10 games', '🏆', 20, 'total_games', 10),
('dedicated', 'Dedicated Gamer', 'Play 50 games', '🎯', 50, 'total_games', 50),
('legend', 'Legend', 'Play 100 games', '👑', 100, 'total_games', 100),
('streak_master', 'Streak Master', 'Win 5 games in a row', '🔥', 30, 'current_streak', 5),
('unstoppable', 'Unstoppable', 'Win 10 games in a row', '🚀', 75, 'current_streak', 10),
('high_scorer', 'High Scorer', 'Reach 500 points', '⭐', 25, 'score', 500),
('champion', 'Champion', 'Reach 1000 points', '🏅', 50, 'score', 1000),
('time_master', 'Time Master', 'Play for 1 hour total', '⏰', 30, 'total_play_time', 3600),
('early_bird', 'Early Bird', 'Join the community', '🐦', 5, 'created', 1)
ON CONFLICT (id) DO NOTHING;

-- Row Level Security Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Users can read all user profiles but only update their own
CREATE POLICY "Users can view all profiles" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Chat messages are readable by all, writable by authenticated users
CREATE POLICY "Anyone can read chat messages" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "Authenticated users can send messages" ON chat_messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Game sessions are readable by all, writable by owner
CREATE POLICY "Anyone can read game sessions" ON game_sessions FOR SELECT USING (true);
CREATE POLICY "Users can insert own game sessions" ON game_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Achievements are readable by all
CREATE POLICY "Anyone can read achievements" ON achievements FOR SELECT USING (true);
CREATE POLICY "Anyone can read user achievements" ON user_achievements FOR SELECT USING (true);
CREATE POLICY "Users can unlock own achievements" ON user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE game_sessions;