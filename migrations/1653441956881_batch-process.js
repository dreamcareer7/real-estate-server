const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE OR REPLACE FUNCTION brands_children(id uuid[]) RETURNS
   setof uuid
AS
$$
  WITH RECURSIVE children AS (
    SELECT id as brand FROM brands WHERE parent = ANY($1) AND deleted_at IS NULL
    UNION
    SELECT id as brand FROM brands JOIN children ON brands.parent = children.brand AND deleted_at IS NULL
  )

  SELECT UNNEST($1) AS brand UNION SELECT brand FROM children
$$
STABLE
PARALLEL SAFE
LANGUAGE sql`,

  `CREATE OR REPLACE FUNCTION user_brands("user" uuid, roles text[]) RETURNS TABLE(
  brand uuid
)
AS
$$
WITH roles AS (
    SELECT ARRAY_AGG(DISTINCT brands_roles.brand) as brand FROM brands_users
    JOIN brands_roles ON brands_users.role = brands_roles.id
    JOIN brands ON brands_roles.brand = brands.id
    WHERE brands_users.user =$1
    AND (
      CASE
        WHEN $2 IS NULL THEN TRUE
        ELSE brands_roles.acl && $2
      END
    )
    AND brands_users.deleted_at IS NULL
    AND brands.deleted_at IS NULL
  )

SELECT brands_children(roles.brand) FROM roles
$$
LANGUAGE sql;
`,

  'COMMIT'
]


const run = async () => {
  const { conn } = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
