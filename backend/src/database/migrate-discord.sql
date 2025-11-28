-- Migration: Add Discord OAuth support to users table
-- Run this migration if Discord OAuth columns don't exist

-- Add Discord columns if they don't exist
DO $$ 
BEGIN
    -- Add discord_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'discord_id') THEN
        ALTER TABLE users ADD COLUMN discord_id VARCHAR(255) UNIQUE;
    END IF;

    -- Add discord_username column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'discord_username') THEN
        ALTER TABLE users ADD COLUMN discord_username VARCHAR(255);
    END IF;

    -- Add discord_avatar column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'discord_avatar') THEN
        ALTER TABLE users ADD COLUMN discord_avatar VARCHAR(500);
    END IF;

    -- Make email and password_hash nullable (for Discord-only accounts)
    ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
    ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
    ALTER TABLE users ALTER COLUMN username DROP NOT NULL;

    -- Add constraint to ensure at least one auth method
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_auth_check') THEN
        ALTER TABLE users ADD CONSTRAINT users_auth_check CHECK (
            (email IS NOT NULL AND password_hash IS NOT NULL) OR 
            discord_id IS NOT NULL
        );
    END IF;

    -- Create index for discord_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_discord_id') THEN
        CREATE INDEX idx_users_discord_id ON users(discord_id);
    END IF;
END $$;

