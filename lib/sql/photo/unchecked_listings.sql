SELECT
  matrix_unique_id
FROM listings
WHERE
  photos_checked_at IS NULL
LIMIT 100;
