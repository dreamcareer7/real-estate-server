UPDATE 
  listings
SET 
  status = $3
WHERE
  matrix_unique_id = ANY($1::bigint[]) AND mls = $2::mls