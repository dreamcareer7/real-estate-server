SELECT brands_subscriptions.*,
  'brand_subscription' AS TYPE,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at,
  plan,
  customer,
  status,
  plan_quantity,
  chargebee_id,
  (chargebee_object->'trial_end')::int as trial_ends_at,
  (chargebee_object->'price')::int as price,
  (chargebee_object->>'name') as name,
  (chargebee_object->>'description') as description,
  (chargebee_object->>'period') as period,
  (chargebee_object->>'price_unit') as price_unit

FROM brands_subscriptions
JOIN unnest($1::uuid[]) WITH ORDINALITY t(bsid, ord) ON brands_subscriptions.id = bsid
ORDER BY t.ord
