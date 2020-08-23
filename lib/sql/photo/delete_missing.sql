UPDATE
  photos
SET
  deleted_at = CLOCK_TIMESTAMP()
WHERE
  listing_mui = $1::bigint
  AND
  mls = $2::mls
  AND NOT (matrix_unique_id = ANY($3::text[]));
