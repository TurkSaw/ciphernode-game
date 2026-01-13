-- 1. Tüm Kullanıcıları ve Rollerini Gör (Yeniden Eskiye)
SELECT username, email, role, level, created_at 
FROM users 
ORDER BY created_at DESC;

-- 2. Sadece Yetkili Kişileri (Admin/Superadmin) Gör
SELECT * 
FROM users 
WHERE role IN ('admin', 'superadmin');

-- 3. Hangi Rolden Kaç Kişi Var? (Özet)
SELECT role, COUNT(*) as kisiler 
FROM users 
GROUP BY role;

-- 4. Belirli bir kullanıcının rolünü manuel güncelleme (Gerekirse)
-- UPDATE users SET role = 'admin' WHERE email = 'ornek@email.com';
