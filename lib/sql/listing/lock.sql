SELECT
  id,
  revision
FROM
  listings
WHERE
  matrix_unique_id = $1 AND mls = $2::mls
FOR UPDATE
