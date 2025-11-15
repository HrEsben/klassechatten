-- Add moderation_level column to classes table
-- This allows fine-grained control over AI moderation per class

-- Create enum type for moderation levels
CREATE TYPE moderation_level AS ENUM ('strict', 'moderate', 'relaxed');

-- Add moderation_level column with default 'moderate'
ALTER TABLE classes
ADD COLUMN moderation_level moderation_level NOT NULL DEFAULT 'moderate';

-- Add comment explaining the levels
COMMENT ON COLUMN classes.moderation_level IS 
'Controls AI moderation sensitivity:
- strict: Low thresholds, blocks more content (0.3-0.5)
- moderate: Balanced thresholds (0.5-0.7) - DEFAULT
- relaxed: Higher thresholds, allows more content (0.7-0.9)';

-- Create index for faster queries
CREATE INDEX idx_classes_moderation_level ON classes(moderation_level);
