SELECT brands_customers.*,
  'brand_customer' AS TYPE
--   EXTRACT(EPOCH FROM created_at) AS created_at,
--   EXTRACT(EPOCH FROM updated_at) AS updated_at,

FROM brands_customers
JOIN unnest($1::uuid[]) WITH ORDINALITY t(bcid, ord) ON brands_customers.id = bcid
ORDER BY t.ord
