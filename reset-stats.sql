-- CipherNode Game - İstatistik Sıfırlama Scripti
-- Bu script kullanıcıları korur ancak tüm istatistikleri sıfırlar

-- 1. Kullanıcı istatistiklerini sıfırla (kullanıcı hesapları korunur)
UPDATE users SET 
    score = 0,
    level = 1,
    energy = 100,
    last_energy_update = NOW(),
    total_games = 0,
    total_play_time = 0,
    current_streak = 0,
    max_streak = 0,
    best_time = NULL,
    last_played = NULL,
    updated_at = NOW()
WHERE id IS NOT NULL;

-- 2. Tüm oyun oturumlarını sil
DELETE FROM game_sessions;

-- 3. Tüm kullanıcı başarımlarını sil (başarımlar tablosu korunur)
DELETE FROM user_achievements;

-- 4. Chat mesajlarını sil (isteğe bağlı - yorumdan çıkarın eğer chat'i de temizlemek istiyorsanız)
-- DELETE FROM chat_messages;

-- 5. Sequence'leri sıfırla (eğer varsa)
-- Bu PostgreSQL'de UUID kullandığımız için gerekli değil

-- İstatistik sıfırlama tamamlandı!
-- Kullanıcılar: Korundu (username, email, password, display_name, bio, avatar, country, theme)
-- Sıfırlanan: score, level, energy, total_games, total_play_time, streaks, best_time
-- Silinen: game_sessions, user_achievements