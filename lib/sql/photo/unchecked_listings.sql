SELECT
  matrix_unique_id
FROM listings
WHERE
  photos_checked_at IS NULL
  OR
  photos_checked_at < updated_at
LIMIT 100;