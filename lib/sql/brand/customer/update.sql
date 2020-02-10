UPDATE brands_subscriptions SET
  chargebee_object = $2,
  updated_within = $3
WHERE chargebee_id = $1
