ALTER TABLE user_profiles
ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0
CHECK (is_admin IN (0, 1));

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_single_admin
ON user_profiles (is_admin)
WHERE is_admin = 1;

UPDATE user_profiles
SET is_admin = 1
WHERE profile_name = 'Výchozí';