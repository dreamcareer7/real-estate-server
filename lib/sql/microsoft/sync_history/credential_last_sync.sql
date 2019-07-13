SELECT
  id
FROM
  microsoft_sync_histories 
WHERE 
  "user" = $1
  AND brand = $2
  AND microsoft_credential = $3
ORDER BY created_at DESC
LIMIT 1