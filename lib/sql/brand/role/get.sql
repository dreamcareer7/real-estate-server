SELECT brands_roles.*,
  'brand_role' AS TYPE,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at

FROM brands_roles
JOIN unnest($1::uuid[]) WITH ORDINALITY t(bid, ord) ON brands_roles.id = bid
ORDER BY t.ord