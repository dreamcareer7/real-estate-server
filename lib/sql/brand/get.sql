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
      (
        SELECT
        (
          (
            SELECT COUNT(*)
            FROM contacts
            INNER JOIN contacts_emails
            ON contacts.id = contacts_emails.contact
            WHERE contacts."user" = $1 AND
                  LOWER(contacts_emails.email) = (SELECT lower(email) FROM users WHERE id = $2 LIMIT 1)
          ) +
          (
            SELECT COUNT(*)
            FROM contacts
            INNER JOIN contacts_phone_numbers
            ON contacts.id = contacts_phone_numbers.contact
            WHERE contacts."user" = $1 AND
                  contacts_phone_numbers.phone_number = (SELECT phone_number FROM users WHERE id = $2 LIMIT 1)
          )
        )
      ) END
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
  ),

  (
    CASE WHEN $2::uuid IS NULL THEN
      NULL
    ELSE
      (SELECT room FROM rooms_users WHERE "user" = $2 AND reference = ('Brand/' || $1))
    END
  ) as room

FROM brands
WHERE id = $1
LIMIT 1
