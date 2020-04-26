SELECT
  id
FROM
  microsoft_credentials 
WHERE 
  brand = $1
  AND deleted_at IS NULL
  AND revoked IS FALSE