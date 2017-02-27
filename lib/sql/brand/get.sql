WITH brand_offices AS (
  SELECT id, matrix_unique_id FROM offices WHERE id IN (
    SELECT office FROM brands_offices WHERE brand = $1
  )
),

brand_agents AS (
  SELECT get_brand_agents($1) AS id
),

brand_users AS (
  SELECT get_brand_users($1) AS id
),

sorted_brand_users AS (
  SELECT 
    brand_users.id as id,
    (
      CASE WHEN $2::uuid IS NULL THEN 0
           WHEN brand_users.id = $2 THEN 1
           ELSE 0
      END
    ) as is_me,
    (
      CASE WHEN $2::uuid IS NULL THEN 0 ELSE
        (SELECT count(*) FROM contacts WHERE "user" = $1 AND contact_user = $2)
      END
    ) as has_contact
    FROM brand_users
  JOIN users ON brand_users.id = users.id
  ORDER BY is_me DESC, has_contact DESC, RANDOM()
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
    SELECT ARRAY_AGG(id) FROM sorted_brand_users
  ) AS users,
  
  (
    SELECT JSON_AGG(brands_users) FROM brands_users WHERE brand = $1
  ) AS roles,
  
  (
    SELECT ARRAY_AGG(hostname ORDER BY "default" DESC) FROM brands_hostnames WHERE brand = $1
  ) AS hostnames,

  (
    SELECT parent FROM brands_parents WHERE brand = $1
  )
      
FROM brands
WHERE id = $1
LIMIT 1
