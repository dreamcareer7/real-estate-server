SELECT brands_users.*,
  'brand_user' AS TYPE
--   EXTRACT(EPOCH FROM created_at) AS created_at,
--   EXTRACT(EPOCH FROM updated_at) AS updated_at

FROM brands_users
JOIN unnest($1::uuid[]) WITH ORDINALITY t(buid, ord) ON brands_users.id = buid
ORDER BY t.ord
