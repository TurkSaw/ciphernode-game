-- 1. Önce Rol sütununu ekle ve verileri taşı
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';

UPDATE users SET role = 'admin' WHERE is_admin = true;
UPDATE users SET role = 'superadmin' WHERE username = 'TurkSaw';

-- 2. Hata veren politikaları (Policies) SİL
DROP POLICY IF EXISTS "Admins can update everything" ON users;
DROP POLICY IF EXISTS "Admins can delete chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Admins can maintain system" ON users; -- Olası diğer politika

-- 3. Şimdi is_admin sütununu güvenle silebiliriz
ALTER TABLE users DROP COLUMN IF EXISTS is_admin;

-- 4. Politikaları yeni 'role' sistemine göre tekrar oluştur (İsteğe bağlı, güvenlik için)
-- Adminler ve Superadmin'ler her şeyi düzenleyebilir
CREATE POLICY "Admins can update everything" ON users 
    FOR UPDATE USING (
        auth.uid() = id OR 
        exists (select 1 from users where id = auth.uid() and role in ('admin', 'superadmin'))
    );

-- Adminler mesaj silebilir
CREATE POLICY "Admins can delete chat messages" ON chat_messages 
    FOR DELETE USING (
        exists (select 1 from users where id = auth.uid() and role in ('admin', 'superadmin'))
    );
