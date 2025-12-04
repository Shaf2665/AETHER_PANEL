-- Migration: Add custom games storage for Pterodactyl configuration
-- This replaces the hardcoded FiveM and Other game types with a flexible custom games system
INSERT INTO settings (key, value) VALUES
    ('pterodactyl_custom_games', '[]'::jsonb::text)
ON CONFLICT (key) DO NOTHING;

