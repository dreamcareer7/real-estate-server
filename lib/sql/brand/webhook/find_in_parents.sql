SELECT id FROM brands_webhooks
WHERE brand IN (SELECT * FROM brand_parents($1))
AND topic = $2
AND deleted_at IS NULL