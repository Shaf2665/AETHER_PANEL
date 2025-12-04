-- Migration: Update server_templates table to support custom game types
-- Remove the hardcoded game_type constraint to allow any game type (including custom games)

-- Drop the existing constraint
ALTER TABLE server_templates DROP CONSTRAINT IF EXISTS server_templates_game_type_check;

-- Add a new constraint that allows any non-empty string (up to 50 characters)
ALTER TABLE server_templates ADD CONSTRAINT server_templates_game_type_check 
  CHECK (game_type IS NOT NULL AND LENGTH(TRIM(game_type)) > 0 AND LENGTH(game_type) <= 50);

