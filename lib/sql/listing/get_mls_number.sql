SELECT id
FROM listings
WHERE mls_number = $1
AND (
  $2::mls IS NULL
  OR public_display IS TRUE
  OR mls = $2::mls
)
