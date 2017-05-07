UPDATE
  photos
SET
  deleted_at = CLOCK_TIMESTAMP()
WHERE
  listing_mui = $1::int
  AND
  NOT (matrix_unique_id = ANY($2::int[]));
