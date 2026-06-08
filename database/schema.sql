PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS streaming_services (
    service_id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_name TEXT NOT NULL UNIQUE,
    provider_key TEXT,
    active_flag INTEGER NOT NULL DEFAULT 1 CHECK (active_flag IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE TABLE IF NOT EXISTS media_titles (
    title_id INTEGER PRIMARY KEY AUTOINCREMENT,
    tmdb_id INTEGER,
    media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
    display_title TEXT NOT NULL,
    original_title TEXT,
    release_year INTEGER,
    poster_path TEXT,
    rating_value REAL,
    runtime_minutes INTEGER,
    original_language TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tmdb_id, media_type)
) STRICT;

CREATE TABLE IF NOT EXISTS title_services (
  title_id INTEGER NOT NULL,
  service_id INTEGER NOT NULL,
  official_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (title_id, service_id),

  FOREIGN KEY (title_id) REFERENCES media_titles(title_id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES streaming_services(service_id) ON DELETE CASCADE
) STRICT;

CREATE TABLE IF NOT EXISTS media_genres (
  genre_id INTEGER PRIMARY KEY,
  genre_name TEXT NOT NULL UNIQUE
) STRICT;

CREATE TABLE IF NOT EXISTS title_genres (
  title_id INTEGER NOT NULL,
  genre_id INTEGER NOT NULL,

  PRIMARY KEY (title_id, genre_id),

  FOREIGN KEY (title_id) REFERENCES media_titles(title_id) ON DELETE CASCADE,
  FOREIGN KEY (genre_id) REFERENCES media_genres(genre_id) ON DELETE CASCADE
) STRICT;