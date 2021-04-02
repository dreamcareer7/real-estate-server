const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE OR REPLACE FUNCTION user_brands("user" uuid, roles text[]) RETURNS TABLE(
  brand uuid
)
AS
$$
  WITH roles AS (
    SELECT DISTINCT brands_roles.brand as brand FROM brands_users
    JOIN brands_roles ON brands_users.role = brands_roles.id
    JOIN brands ON brands_roles.brand = brands.id
    WHERE brands_users.user = $1
    AND brands_users.deleted_at IS NULL
    AND brands.deleted_at IS NULL
    AND (
      CASE
        WHEN $2 IS NULL THEN TRUE
        ELSE brands_roles.acl && $2
      END
    )
  )

SELECT brand_children(roles.brand) FROM roles
$$
LANGUAGE sql;`,
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
