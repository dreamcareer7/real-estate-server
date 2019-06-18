SELECT
  id
FROM
  google_credentials 
WHERE 
  "user" = $1
  AND brand = $2