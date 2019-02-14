const db = require('../lib/utils/db')

const user_has_brand_access = `CREATE OR REPLACE FUNCTION user_has_brand_access("user" uuid, brand uuid)
RETURNS boolean AS
$$
  SELECT
    count(*) > 0 AS has
  FROM
    brands_roles
  JOIN
    brands_users ON brands_users.role = brands_roles.id
  WHERE
    brands_users.user = $1
    AND brands_users.deleted_at IS NULL
    AND brand IN(SELECT * FROM brand_parents($2))
$$
LANGUAGE sql;
`

const get_brand_agents = `CREATE OR REPLACE FUNCTION get_brand_agents(id uuid) RETURNS TABLE (
   "user" uuid,
   agent uuid,
   mlsid text
) AS
$$
  SELECT
    users.id as "user",
    agents.id as agent,
    agents.mlsid as mlsid
    FROM users
  LEFT JOIN agents ON users.agent = agents.id
  WHERE users.id IN (
    (SELECT DISTINCT "user" FROM brands_users
    JOIN brands_roles ON brands_users.role = brands_roles.id
    WHERE
    brands_users.deleted_at IS NULL
    AND brands_roles.brand IN(
      SELECT brand_children($1)
    ))
  ) AND users.user_type = 'Agent'
  UNION
  SELECT
    users.id as "user",
    agents.id as agent,
    agents.mlsid as mlsid
    FROM agents
    LEFT JOIN users ON agents.id = users.agent
    WHERE office_mui IN (
      SELECT matrix_unique_id
      FROM offices
      WHERE id IN
      (
        SELECT office FROM brands_offices WHERE brand = $1
      )
    ) AND agents.status = 'Active'
$$
LANGUAGE sql`

const get_brand_users = `CREATE OR REPLACE FUNCTION get_brand_users(id uuid) RETURNS
   setof uuid
AS
$$
  SELECT "user" FROM brands_users
  JOIN brands_roles ON brands_users.role = brands_roles.id
  WHERE brands_roles.brand = $1
  AND brands_users.deleted_at IS NULL
  UNION
  SELECT id FROM users WHERE agent IN (
    SELECT id FROM agents
    WHERE office_mui IN (
      SELECT matrix_unique_id FROM offices
      WHERE id IN (SELECT office FROM brands_offices WHERE brand = $1)
    )
  )
$$
LANGUAGE sql`

const get_user_brands = `CREATE OR REPLACE FUNCTION user_brands("user" uuid, roles text[]) RETURNS TABLE(
  brand uuid
)
AS
$$
  WITH roles AS (
    SELECT DISTINCT brands_roles.brand as brand FROM brands_users
    JOIN brands_roles ON brands_users.role = brands_roles.id
    WHERE brands_users.user = $1
    AND brands_users.deleted_at IS NULL
    AND (
      CASE
        WHEN $2 IS NULL THEN TRUE
        ELSE brands_roles.acl && $2
      END
    )
  )

SELECT brand_children(roles.brand) FROM roles
$$
LANGUAGE sql`

const migrations = [
  'BEGIN',
  'ALTER TABLE brands_users ADD deleted_at timestamp with time zone',
  `WITH to_delete AS (
    SELECT
      role,
      "user",
      count(*)
    FROM
      brands_users
    GROUP BY
      role,
      "user"
    HAVING count(*) > 1
  )
  DELETE FROM
    brands_users
  WHERE
    (role, "user") IN (SELECT role, "user" FROM to_delete)`,
  'ALTER TABLE brands_users ADD CONSTRAINT unique_role_user UNIQUE(role, "user")',
  user_has_brand_access,
  get_brand_agents,
  get_brand_users,
  get_user_brands,
  'COMMIT'
]


const run = async () => {
  const conn = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
