const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE OR REPLACE FUNCTION public.brand_valid_children(id uuid)
    RETURNS SETOF uuid
    LANGUAGE sql
    STABLE PARALLEL SAFE
   AS $function$
     WITH RECURSIVE children AS (
       SELECT id as brand FROM brands WHERE parent = $1 AND deleted_at IS NULL AND training IS FALSE
       UNION
       SELECT id as brand FROM brands JOIN children ON brands.parent = children.brand AND deleted_at IS NULL AND training IS FALSE
     )

     SELECT $1 AS brand UNION SELECT brand FROM children
   $function$`,

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
