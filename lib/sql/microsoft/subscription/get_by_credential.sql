
SELECT
  id
FROM
  microsoft_subscriptions 
WHERE 
  microsoft_credential = $1
  AND deleted_at IS NULL