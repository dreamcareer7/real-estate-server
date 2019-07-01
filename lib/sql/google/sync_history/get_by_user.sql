SELECT
  id
FROM
  google_sync_histories 
WHERE 
  "user" = $1
  AND brand = $2