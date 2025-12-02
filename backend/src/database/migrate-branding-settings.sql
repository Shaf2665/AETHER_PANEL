-- Migration: Add branding settings to the settings table
INSERT INTO settings (key, value) VALUES
    ('dashboard_name', 'Aether Dashboard'),
    ('dashboard_short_name', 'Aether'),
    ('sidebar_logo_url', ''),
    ('main_logo_url', '')
ON CONFLICT (key) DO NOTHING;

