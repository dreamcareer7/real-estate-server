SELECT brands_roles.*,
  'brand_role' AS TYPE,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at,

  (
    SELECT ARRAY_AGG("id") FROM brands_users WHERE
    role = brands_roles.id AND
    (
      $2::uuid[] IS NULL OR "user" = ANY($2)
    )
  ) as users

FROM brands_roles
JOIN unnest($1::uuid[]) WITH ORDINALITY t(bid, ord) ON brands_roles.id = bid
ORDER BY t.ord
