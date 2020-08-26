SELECT
  bs.id,
  'brand_subscription' AS TYPE,
  EXTRACT(EPOCH FROM bs.created_at) AS created_at,
  EXTRACT(EPOCH FROM bs.updated_at) AS updated_at,
  bs.plan,
  bs.customer,
  bs.status,
  bs.plan_quantity,
  bs.chargebee_id,
  (bs.chargebee_object->>'trial_end')::int as trial_ends_at,
  (bs.chargebee_object->>'billing_period') as billing_period,
  (bs.chargebee_object->>'plan_unit_price') as plan_unit_price,
  (bs.chargebee_object->>'plan_unit_price') as plan_unit_price,
  (bc.chargebee_object->'customer'->>'card_status') as card_status

FROM brands_subscriptions bs
JOIN brands_customers bc ON bs.customer = bc.id

JOIN unnest($1::uuid[]) WITH ORDINALITY t(bsid, ord) ON bs.id = bsid
ORDER BY t.ord
