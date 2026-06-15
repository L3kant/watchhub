CREATE TABLE IF NOT EXISTS profile_title_statuses (
  profile_id INTEGER NOT NULL,
  title_id INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('planned', 'watching', 'watched', 'hidden')
  ),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (profile_id, title_id),

  FOREIGN KEY (profile_id)
    REFERENCES user_profiles(profile_id)
    ON DELETE CASCADE,

  FOREIGN KEY (title_id)
    REFERENCES media_titles(title_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_profile_title_statuses_profile_status
ON profile_title_statuses (profile_id, status);

CREATE INDEX IF NOT EXISTS idx_profile_title_statuses_title
ON profile_title_statuses (title_id);