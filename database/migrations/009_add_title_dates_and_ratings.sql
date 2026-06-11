ALTER TABLE media_titles
ADD COLUMN release_date TEXT;

ALTER TABLE media_titles
ADD COLUMN first_air_date TEXT;

ALTER TABLE media_titles
ADD COLUMN last_air_date TEXT;

ALTER TABLE media_titles
ADD COLUMN latest_season_air_date TEXT;

ALTER TABLE media_titles
ADD COLUMN age_rating INTEGER
CHECK (age_rating IS NULL OR (age_rating >= 0 AND age_rating <= 18));

ALTER TABLE media_titles
ADD COLUMN age_rating_country TEXT;

ALTER TABLE media_titles
ADD COLUMN adult_flag INTEGER NOT NULL DEFAULT 0
CHECK (adult_flag IN (0, 1));