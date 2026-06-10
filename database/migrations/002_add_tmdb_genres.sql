ALTER TABLE media_genres
ADD COLUMN tmdb_genre_id INTEGER;

ALTER TABLE media_genres
ADD COLUMN media_type TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_media_genres_tmdb_type
ON media_genres (tmdb_genre_id, media_type);