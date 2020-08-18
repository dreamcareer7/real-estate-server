UPDATE brands_subscriptions SET
  updated_within = $1,
  plan = $3,
  status = $4::subscription_status,
  plan_quantity = $5,
  chargebee_object = $6
WHERE chargebee_id = $2
