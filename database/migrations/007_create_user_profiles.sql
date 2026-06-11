CREATE TABLE IF NOT EXISTS user_profiles (
  profile_id INTEGER PRIMARY KEY,
  profile_name TEXT NOT NULL UNIQUE,

  max_age_rating INTEGER NOT NULL DEFAULT 18
    CHECK (max_age_rating >= 0 AND max_age_rating <= 18),

  blocked_services_json TEXT NOT NULL DEFAULT '[]',

  avatar_key TEXT,
  color_key TEXT,

  active_flag INTEGER NOT NULL DEFAULT 1
    CHECK (active_flag IN (0, 1)),

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

INSERT OR IGNORE INTO user_profiles (
  profile_name,
  max_age_rating,
  blocked_services_json,
  avatar_key,
  color_key,
  active_flag
)
VALUES (
  'Výchozí',
  18,
  '[]',
  'default',
  'blue',
  1
);