
-- Create enum type for key_source
CREATE TYPE key_source_type AS ENUM ('local', 'master');

-- Add key_source column to user_encryption_keys table
ALTER TABLE user_encryption_keys 
ADD COLUMN key_source key_source_type DEFAULT 'local' NOT NULL;

-- Update any existing entries to use 'local' (this is redundant due to DEFAULT but ensures consistency)
UPDATE user_encryption_keys 
SET key_source = 'local' 
WHERE key_source IS NULL;
