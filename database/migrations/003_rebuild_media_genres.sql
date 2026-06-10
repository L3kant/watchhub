PRAGMA foreign_keys = OFF;

CREATE TABLE media_genres_new (
  genre_id INTEGER PRIMARY KEY AUTOINCREMENT,
  genre_name TEXT NOT NULL,
  tmdb_genre_id INTEGER,
  media_type TEXT
);

INSERT INTO media_genres_new (
  genre_id,
  genre_name,
  tmdb_genre_id,
  media_type
)
SELECT
  genre_id,
  genre_name,
  tmdb_genre_id,
  media_type
FROM media_genres;

DROP TABLE media_genres;

ALTER TABLE media_genres_new
RENAME TO media_genres;

CREATE UNIQUE INDEX IF NOT EXISTS idx_media_genres_tmdb_type
ON media_genres (tmdb_genre_id, media_type);

PRAGMA foreign_keys = ON;