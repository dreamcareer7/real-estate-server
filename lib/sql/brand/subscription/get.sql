SELECT brands_subscriptions.*,
  'brand_subscription' AS TYPE,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at

FROM brands_subscriptions
JOIN unnest($1::uuid[]) WITH ORDINALITY t(bsid, ord) ON brands_subscriptions.id = bsid
ORDER BY t.ord
