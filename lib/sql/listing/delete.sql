UPDATE 
  listings
SET 
  deleted_at = CLOCK_TIMESTAMP()
WHERE
  matrix_unique_id = ANY($1::bigint[]) AND mls = $2::mls