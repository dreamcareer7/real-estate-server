SELECT brands.*,
  'brand' AS TYPE,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at,

  ARRAY(
    SELECT mls_id FROM offices WHERE id IN (
      SELECT office FROM brands_offices WHERE brand = brands.id
    )
  ) AS offices,

  ARRAY(SELECT get_brand_users(brands.id)) as users,

  (
    SELECT JSON_AGG(brands_users) FROM brands_users WHERE brand = brands.id AND role IS NOT NULL
  ) AS roles,

  (
    SELECT ARRAY_AGG(hostname ORDER BY "default" DESC) FROM brands_hostnames WHERE brand = brands.id
  ) AS hostnames,

  (
    SELECT parent FROM brands_parents WHERE brand = brands.id
  ),

  (
    CASE WHEN $2::uuid IS NULL THEN
      NULL
    ELSE
      (
        SELECT room FROM rooms_users
        WHERE "user" = $2 AND reference = ('Brand/' || brands.id)
        LIMIT 1
      )
    END
  ) as room

FROM brands
JOIN unnest($1::uuid[]) WITH ORDINALITY t(bid, ord) ON brands.id = bid
ORDER BY t.ord
