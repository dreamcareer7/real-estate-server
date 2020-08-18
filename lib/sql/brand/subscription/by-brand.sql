SELECT * FROM brands_subscriptions
WHERE brand = $1 AND deleted_at IS NULL
