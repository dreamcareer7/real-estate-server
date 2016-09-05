SELECT
  matrix_unique_id
FROM listings
WHERE
  photos_checked_at IS NULL
  AND (
    (SELECT count(*) FROM photos WHERE listing_mui = listings.matrix_unique_id) > 0
  )
LIMIT 100;
