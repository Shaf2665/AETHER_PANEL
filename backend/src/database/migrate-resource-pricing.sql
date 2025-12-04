-- Migration: Add resource pricing settings to the settings table
INSERT INTO settings (key, value) VALUES
    ('resource_pricing_cpu_per_core', '100'),
    ('resource_pricing_cpu_per_hour', '5'),
    ('resource_pricing_memory_per_gb', '200'),
    ('resource_pricing_memory_per_hour', '10'),
    ('resource_pricing_disk_per_gb', '50'),
    ('resource_pricing_disk_per_hour', '2')
ON CONFLICT (key) DO NOTHING;

