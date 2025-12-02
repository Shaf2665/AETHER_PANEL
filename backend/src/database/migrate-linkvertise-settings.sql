-- Migration: Add Linkvertise settings to settings table
-- This allows Linkvertise configuration to be managed via the admin UI

-- Insert default Linkvertise settings
INSERT INTO settings (key, value) VALUES
    ('linkvertise_enabled', 'false'),
    ('linkvertise_api_key', ''),
    ('linkvertise_coins_per_completion', '50'),
    ('linkvertise_cooldown_minutes', '30'),
    ('linkvertise_manual_mode', 'true')
ON CONFLICT (key) DO NOTHING;

