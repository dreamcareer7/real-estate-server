SELECT brands_subscriptions.*,
  chargebee_subscriptions.chargebee_id,
  chargebee_subscriptions.status,
  chargebee_subscriptions.chargebee_object->'trial_start' as trial_start,
  chargebee_subscriptions.chargebee_object->'trial_end' as trial_end,
  chargebee_subscriptions.chargebee_object->'billing_period_unit' as billing_period_unit,
  chargebee_subscriptions.chargebee_object->'billing_period' as billing_period,
  chargebee_subscriptions.plan,
  'brand_subscription' AS TYPE,
  EXTRACT(EPOCH FROM brands_subscriptions.created_at) AS created_at,
  EXTRACT(EPOCH FROM brands_subscriptions.updated_at) AS updated_at

FROM brands_subscriptions
JOIN chargebee_subscriptions ON brands_subscriptions.chargebee = chargebee_subscriptions.id
JOIN unnest($1::uuid[]) WITH ORDINALITY t(bsid, ord) ON brands_subscriptions.id = bsid
ORDER BY t.ord
