-- Migration: Switch from is_admin boolean to role string
-- 1. Add role column
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';

-- 2. Migrate existing admins
UPDATE users SET role = 'admin' WHERE is_admin = true;

-- 3. Set specific superadmin (TurkSaw)
UPDATE users SET role = 'superadmin' WHERE username = 'TurkSaw';

-- 4. Drop is_admin column (optional, but cleaner to keep for backwards compatibility for now, or drop if we are sure)
-- We will keep is_admin for now but make it generated or just ignore it in code. 
-- Actually, let's just drop it to force code to use role.
ALTER TABLE users DROP COLUMN IF EXISTS is_admin;

-- 5. Fix RLS policies to use role
DROP POLICY IF EXISTS "Authenticated users can send messages" ON chat_messages;
CREATE POLICY "Authenticated users can send messages" ON chat_messages FOR INSERT WITH CHECK (auth.role() = 'authenticated'); -- Logic remains same for now, app level checks role

-- 6. Add policy for admin actions (if we were using Supabase Auth completely, but we use custom JWT)
-- Since we use custom JWT, we trust our application server to enforce roles.
