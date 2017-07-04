SELECT stripe_customers.*,
       'stripe_customer' AS type,
       EXTRACT(EPOCH FROM created_at) AS created_at,
       EXTRACT(EPOCH FROM updated_at) AS updated_at
FROM stripe_customers
JOIN unnest($1::uuid[]) WITH ORDINALITY t(cid, ord) ON stripe_customers.id = cid
ORDER BY t.ord
