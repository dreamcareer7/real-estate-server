UPDATE brands_subscriptions SET
  plan = $2,
  status = $3,
  chargebee_object = $4,
  updated_within = $5

WHERE chargebee_id = $1
