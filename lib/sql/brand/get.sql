WITH brand_offices AS (
  SELECT id, matrix_unique_id FROM offices WHERE id IN (
    SELECT office FROM brands_offices WHERE brand = $1
  )
),

brand_agents AS (
  SELECT id FROM agents WHERE
  id IN (
    SELECT agent FROM brands_agents WHERE brand = $1
    UNION
    SELECT agent FROM users WHERE id IN (
      SELECT id FROM users WHERE brand = $1
    )
  )
  OR
  office_mui IN(
    SELECT matrix_unique_id FROM brand_offices
  )
),

brand_users AS (
  SELECT id FROM users WHERE id IN (
    SELECT id FROM users WHERE brand = $1
    UNION
    SELECT id FROM users WHERE agent IN( SELECT id FROM brand_agents )
  )
)

SELECT *,
  'brand' AS TYPE,
  EXTRACT(EPOCH FROM created_at) AS created_at,
  EXTRACT(EPOCH FROM updated_at) AS updated_at,
  
  (
    SELECT ARRAY_AGG(id) FROM brand_offices
  ) AS offices,

  (
    SELECT ARRAY_AGG(id) FROM brand_agents
  ) AS agents,

  (
    SELECT ARRAY_AGG(id) FROM brand_users
  ) AS users,
  
  (
    SELECT JSON_AGG(brands_users) FROM brands_users WHERE brand = $1
  ) AS roles,
  
  (
    SELECT ARRAY_AGG(hostname ORDER BY "default") FROM brands_hostnames WHERE brand = $1
  ) AS hostnames
      
FROM brands
WHERE id = $1
LIMIT 1
