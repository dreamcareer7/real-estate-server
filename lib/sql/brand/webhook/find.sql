SELECT
  id
FROM
  brands_webhooks
  JOIN unnest($1::uuid[]) AS b(brand) USING (brand)
WHERE 
  topic = $2
  AND deleted_at IS NULL
