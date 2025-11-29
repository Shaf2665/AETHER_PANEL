-- Migration: Add admin role support to users table
-- Run this migration to add role-based access control

-- Add role column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin'));
    END IF;
END $$;

-- Create index on role column
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Optional: Set first user as admin (uncomment if needed)
-- UPDATE users SET role = 'admin' WHERE id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1);

