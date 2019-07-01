SELECT
  id
FROM
  google_sync_histories 
WHERE 
  "user" = $1
  AND brand = $2
  AND google_credential = $3
ORDER BY created_at DESC
LIMIT 1