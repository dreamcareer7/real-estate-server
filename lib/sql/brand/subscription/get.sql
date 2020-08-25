SELECT
  id,
  'brand_subscription' AS TYPE,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at,
  plan,
  customer,
  status,
  plan_quantity,
  chargebee_id,
  (chargebee_object->'trial_end')::int as trial_ends_at,
  (chargebee_object->>'billing_period') as billing_period,
  (chargebee_object->>'plan_unit_price') as plan_unit_price

FROM brands_subscriptions
JOIN unnest($1::uuid[]) WITH ORDINALITY t(bsid, ord) ON brands_subscriptions.id = bsid
ORDER BY t.ord
