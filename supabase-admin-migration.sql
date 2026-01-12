-- Admin Panel Migration
-- Run this in Supabase SQL Editor

-- 1. Add is_admin column (default false)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. Add banned column (default false)
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT false;

-- 3. Update Policies to allow Admins to manage users

-- Allow admins to update any user (for banning/unbanning)
CREATE POLICY "Admins can update everything" ON users
  FOR UPDATE USING (
    (SELECT is_admin FROM users WHERE id = auth.uid()) = true
  );

-- Allow admins to view all users (already covered by "Users can view all profiles" but good to be explicit for sensitive data if we hide it later)
-- Existing policy: "Users can view all profiles" -> true. So admins can already see everyone.

-- Allow admins to delete chat messages
CREATE POLICY "Admins can delete chat messages" ON chat_messages
  FOR DELETE USING (
    (SELECT is_admin FROM users WHERE id = auth.uid()) = true
  );

-- Function to check if user is admin (optional helper)
CREATE OR REPLACE FUNCTION is_admin() 
RETURNS BOOLEAN AS $$
  SELECT is_admin FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;
