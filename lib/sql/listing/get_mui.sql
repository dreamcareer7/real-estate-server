SELECT id
FROM listings
WHERE matrix_unique_id = $1 AND mls = $2
AND (
  $3::mls IS NULL
  OR public_display IS TRUE
  OR mls = $3::mls
)

LIMIT 1
