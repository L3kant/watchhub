BEGIN TRANSACTION;

INSERT INTO streaming_services (
  service_id,
  service_name,
  provider_key,
  motn_service_id,
  active_flag
)
VALUES
  (101, 'Netflix', 'netflix', 'netflix', 1),
  (102, 'Disney+', 'disney-plus', 'disney', 1);

INSERT INTO user_profiles (
  profile_id,
  profile_name,
  max_age_rating,
  blocked_services_json,
  is_admin,
  avatar_key,
  color_key,
  active_flag
)
VALUES
  (101, 'Adult Test', 18, '[]', 0, 'default', 'blue', 1),
  (102, 'Kid Test', 7, '[]', 0, 'default', 'green', 1),
  (103, 'No Netflix Test', 18, '[101]', 0, 'default', 'purple', 1);

INSERT INTO media_genres (
  genre_id,
  genre_name,
  tmdb_genre_id,
  media_type
)
VALUES
  (101, 'Drama', 18, 'movie'),
  (102, 'Family', 10751, 'movie'),
  (103, 'TV Drama', 18, 'tv');

INSERT INTO media_titles (
  title_id,
  tmdb_id,
  media_type,
  display_title,
  original_title,
  release_year,
  release_date,
  age_rating,
  adult_flag,
  poster_path,
  rating_value,
  runtime_minutes,
  original_language,
  overview_text
)
VALUES
  (
    1001,
    1001,
    'movie',
    'Smoke Movie',
    'Smoke Movie Original',
    2024,
    '2024-01-15',
    12,
    0,
    '/smoke.jpg',
    7.5,
    110,
    'en',
    'Minimal movie used by API smoke tests.'
  ),
  (
    1002,
    1002,
    'movie',
    'Hidden Movie',
    'Hidden Movie Original',
    2024,
    '2024-02-02',
    12,
    0,
    '/hidden.jpg',
    8.2,
    105,
    'en',
    'Movie hidden for one test profile.'
  ),
  (
    1003,
    1003,
    'movie',
    'Kid Movie',
    'Kid Movie Original',
    2024,
    '2024-03-03',
    7,
    0,
    '/kid.jpg',
    6.9,
    90,
    'en',
    'Movie allowed for kid profile.'
  ),
  (
    1004,
    1004,
    'movie',
    'Adult Movie',
    'Adult Movie Original',
    2024,
    '2024-04-04',
    18,
    1,
    '/adult.jpg',
    7.9,
    120,
    'en',
    'Movie not suitable for kid profile.'
  ),
  (
    1005,
    1005,
    'tv',
    'Smoke Series',
    'Smoke Series Original',
    2024,
    NULL,
    12,
    0,
    '/series.jpg',
    7.1,
    NULL,
    'en',
    'Minimal series used by API smoke tests.'
  );

INSERT INTO title_services (
  title_id,
  service_id
)
VALUES
  (1001, 101),
  (1002, 101),
  (1003, 102),
  (1004, 101),
  (1005, 101);

INSERT INTO title_genres (
  title_id,
  genre_id
)
VALUES
  (1001, 101),
  (1002, 101),
  (1003, 102),
  (1004, 101),
  (1005, 103);

UPDATE media_titles
SET first_air_date = '2024-05-05'
WHERE title_id = 1005;

INSERT INTO profile_title_statuses (
  profile_id,
  title_id,
  status
)
VALUES
  (101, 1002, 'hidden');

COMMIT;