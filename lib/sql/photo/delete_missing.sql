WITH updated_listing AS (
  UPDATE listings SET photos_checked_at = CLOCK_TIMESTAMP()
  WHERE matrix_unique_id = $1::int
)

UPDATE
  photos
SET
  deleted_at = CLOCK_TIMESTAMP()
WHERE
  listing_mui = $1::int
  AND
  NOT (matrix_unique_id = ANY($2::int[]));
