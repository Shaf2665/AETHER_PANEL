-- Migration: Create settings table for storing configuration
-- This allows configuration to be managed via the admin UI

CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on updated_at for faster queries
CREATE INDEX IF NOT EXISTS idx_settings_updated_at ON settings(updated_at);

-- Insert default Pterodactyl settings (can be empty initially)
-- These will be populated via the admin UI or environment variables
INSERT INTO settings (key, value) VALUES
    ('pterodactyl_url', ''),
    ('pterodactyl_api_key', ''),
    ('pterodactyl_client_api_key', ''),
    ('pterodactyl_application_api_key', ''),
    ('pterodactyl_node_id', '1'),
    ('pterodactyl_nest_id', '1'),
    ('pterodactyl_egg_id_minecraft', '1'),
    ('pterodactyl_egg_id_fivem', '2'),
    ('pterodactyl_egg_id_other', '1'),
    ('pterodactyl_default_user_id', '1')
ON CONFLICT (key) DO NOTHING;

