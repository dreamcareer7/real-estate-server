SELECT
  id
FROM
  brands_webhooks
  JOIN unnest($1::uuid[]) AS brands(brand) USING (brand)
WHERE 
  topic = $2
  deleted_at IS NULL
