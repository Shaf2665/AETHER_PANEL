-- Migration: Create server_templates table for managing server templates
CREATE TABLE IF NOT EXISTS server_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    cpu_cores INTEGER NOT NULL CHECK (cpu_cores >= 1 AND cpu_cores <= 100),
    ram_gb INTEGER NOT NULL CHECK (ram_gb >= 1 AND ram_gb <= 1000),
    disk_gb INTEGER NOT NULL CHECK (disk_gb >= 1 AND disk_gb <= 10000),
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0.01 AND price <= 1000000),
    game_type VARCHAR(20) NOT NULL CHECK (game_type IN ('minecraft', 'fivem', 'other')),
    enabled BOOLEAN DEFAULT true,
    icon VARCHAR(100) NOT NULL,
    gradient_colors JSONB DEFAULT '{"color1": "#3b82f6", "color2": "#06b6d4"}'::jsonb,
    display_order INTEGER DEFAULT 0 CHECK (display_order >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_server_templates_display_order ON server_templates(display_order);
CREATE INDEX IF NOT EXISTS idx_server_templates_enabled ON server_templates(enabled);
CREATE INDEX IF NOT EXISTS idx_server_templates_game_type ON server_templates(game_type);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_server_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_server_templates_updated_at
    BEFORE UPDATE ON server_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_server_templates_updated_at();

