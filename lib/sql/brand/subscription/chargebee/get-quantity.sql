SELECT count(*) as quantity FROM brands_subscriptions
WHERE chargebee = $1
AND   deleted_at IS NULL
