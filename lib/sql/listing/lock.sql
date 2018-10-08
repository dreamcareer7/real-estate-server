SELECT
  id,
  revision
FROM
  listings
WHERE
  matrix_unique_id = $1
FOR UPDATE
