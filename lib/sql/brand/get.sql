SELECT brands.*,
  'brand' AS TYPE,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at,

  ARRAY(
    SELECT mls_id FROM offices WHERE id IN (
      SELECT office FROM brands_offices WHERE brand = brands.id
    )
  ) AS offices,

  (
    SELECT ARRAY_AGG(hostname ORDER BY "default" DESC) FROM brands_hostnames WHERE brand = brands.id
  ) AS hostnames,

  (
    SELECT ARRAY_AGG(id) FROM brands_roles WHERE brand = brands.id AND deleted_at IS NULL
  ) as roles,

  (
    SELECT
      count(bu.id)
    FROM
      brands_users AS bu
      JOIN brands_roles AS br
        ON br.id = bu.role
    WHERE
      br.brand = brands.id
  )::INT as member_count

FROM brands
JOIN unnest($1::uuid[]) WITH ORDINALITY t(bid, ord) ON brands.id = bid
ORDER BY t.ord
