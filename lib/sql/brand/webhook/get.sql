SELECT brands_webhooks.*,
  'brand_webhook' AS TYPE,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at
FROM brands_webhooks
JOIN unnest($1::uuid[]) WITH ORDINALITY t(wid, ord) ON brands_webhooks.id = wid
ORDER BY t.ord
