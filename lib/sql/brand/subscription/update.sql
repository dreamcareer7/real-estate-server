UPDATE brands_subscriptions SET
  updated_within = $1,
  plan = $3,
  status = $4,
  plan_quantity = $5,
  chargebee_object = $5
WHERE chargebee_id = $2
