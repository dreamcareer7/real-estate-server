SELECT
  id
FROM
  microsoft_subscriptions 
WHERE 
  microsoft_credential = $1
  AND resource = $2
  AND deleted_at IS NULL