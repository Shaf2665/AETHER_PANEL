-- Migration: Add default theme configuration to settings table
-- This allows admins to customize dashboard appearance via Admin Panel

INSERT INTO settings (key, value) VALUES (
  'theme_config',
  '{
    "colors": {
      "primary": "#3b82f6",
      "secondary": "#8b5cf6",
      "sidebarBg": "linear-gradient(to bottom, #1f2937, #111827)",
      "sidebarText": "#ffffff",
      "sidebarHover": "rgba(255, 255, 255, 0.1)",
      "navActive": "linear-gradient(to right, #3b82f6, #06b6d4)",
      "background": "linear-gradient(to bottom right, #f3f4f6, #e5e7eb)",
      "cardBg": "rgba(255, 255, 255, 0.8)",
      "textPrimary": "#111827",
      "textSecondary": "#6b7280"
    },
    "navigation": {
      "dashboard": "linear-gradient(to right, #3b82f6, #06b6d4)",
      "servers": "linear-gradient(to right, #a855f7, #ec4899)",
      "earnCoins": "linear-gradient(to right, #10b981, #14b8a6)",
      "store": "linear-gradient(to right, #f59e0b, #f97316)",
      "admin": "linear-gradient(to right, #ef4444, #f43f5e)"
    },
    "background": {
      "image": "",
      "overlay": "rgba(0, 0, 0, 0)",
      "position": "center",
      "size": "cover",
      "repeat": "no-repeat"
    },
    "customCSS": ""
  }'
)
ON CONFLICT (key) DO NOTHING;

