SELECT chargebee_subscriptions.*,
  'chargebee_subscription' AS TYPE,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at

FROM chargebee_subscriptions
JOIN unnest($1::uuid[]) WITH ORDINALITY t(csid, ord) ON chargebee_subscriptions.id = csid
ORDER BY t.ord
