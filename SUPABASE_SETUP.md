# Supabase Database Setup

Projenin veritabanını sıfırdan kurmak veya güncellemek için aşağıdaki SQL kodlarını kullanabilirsiniz.

## Nasıl Kullanılır?
1. [Supabase Dashboard](https://supabase.com/dashboard) adresine gidin.
2. Projenizi seçin.
3. Sol menüden **SQL Editor** seçeneğine tıklayın.
4. **New Query** butonuna tıklayın.
5. Aşağıdaki kodlardan İHTİYACINIZ OLANI (Sıfırdan kurulum veya güncelleme) yapıştırın.
6. **Run** butonuna basın.

---

## Seçenek 1: Tam Temizlik ve Sıfırdan Kurulum (ÖNERİLEN)
⚠️ **DİKKAT:** Bu kod mevcut tüm verileri (kullanıcılar, skorlar, mesajlar) **SİLER** ve veritabanını tertemiz hale getirir. "Her şeyi silip düzgün kurmak" istediğiniz için bunu öneririm.

```sql
-- 1. CLEANUP: Drop existing tables and types
DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS game_sessions CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP FUNCTION IF EXISTS calculate_energy CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

-- 2. CREATE TABLES

-- Users table
CREATE TABLE users (
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
CREATE TABLE chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(30) NOT NULL,
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game sessions table
CREATE TABLE game_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    level_reached INTEGER NOT NULL,
    game_time INTEGER NOT NULL,
    won BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Achievements table
CREATE TABLE achievements (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(10) NOT NULL,
    points INTEGER DEFAULT 0,
    condition_type VARCHAR(50) NOT NULL,
    condition_value INTEGER
);

-- User achievements junction table
CREATE TABLE user_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    achievement_id VARCHAR(50) REFERENCES achievements(id),
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- 3. INDEXES
CREATE INDEX idx_users_score ON users(score DESC);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_game_sessions_user_id ON game_sessions(user_id);

-- 4. VIEWS
CREATE OR REPLACE VIEW leaderboard AS
SELECT 
    username, display_name, score, level, total_games, best_time, current_streak,
    ROW_NUMBER() OVER (ORDER BY score DESC) as rank
FROM users 
WHERE score > 0
ORDER BY score DESC;

-- 5. FUNCTIONS & TRIGGERS

-- Timestamp Updater
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Energy Calculation
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
    
    IF user_record IS NULL THEN RETURN; END IF;
    
    minutes_passed := EXTRACT(EPOCH FROM (NOW() - user_record.last_energy_update)) / 60;
    energy_to_add := FLOOR(minutes_passed / 5);
    new_energy := LEAST(100, user_record.energy + energy_to_add);
    
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

-- 6. SEED DATA (Achievements)
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
('early_bird', 'Early Bird', 'Join the community', '🐦', 5, 'created', 1);

-- 7. RLS SECURITY POLICIES
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Allow public access for implementation simplicity (Customize as needed)
CREATE POLICY "Public profiles" ON users FOR SELECT USING (true);
CREATE POLICY "Public insert" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Self update" ON users FOR UPDATE USING (auth.uid() = id); -- Requires Supabase Auth to work fully

-- Default permissive policies for game logic (Since we use a custom server-side backend)
-- Note: In a real prod app with Supabase Auth on client, these should be stricter.
-- Since our Node.js server handles DB ops with the SERVICE KEY (or anon key), strict RLS is less critical 
-- IF all access goes through our server. 
-- However, since we use supabase-js client on server, RLS generally applies to the user context if set.
-- Here we'll keep them open for the application to function easily.
CREATE POLICY "Enable read for all" ON users FOR SELECT USING (true);
CREATE POLICY "Enable read for all chat" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "Enable insert for all chat" ON chat_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable read for all sessions" ON game_sessions FOR SELECT USING (true);
CREATE POLICY "Enable insert for all sessions" ON game_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable read for all achievements" ON achievements FOR SELECT USING (true);
CREATE POLICY "Enable read for all user achievements" ON user_achievements FOR SELECT USING (true);
CREATE POLICY "Enable insert for user achievements" ON user_achievements FOR INSERT WITH CHECK (true);
```
