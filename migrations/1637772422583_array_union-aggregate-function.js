const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE FUNCTION array_union_step (s ANYARRAY, n ANYARRAY) RETURNS ANYARRAY
    AS $$ SELECT s || n; $$
    LANGUAGE SQL IMMUTABLE PARALLEL SAFE`,

  `CREATE FUNCTION array_union_final (s ANYARRAY) RETURNS ANYARRAY
    AS $$
      SELECT array_agg(i ORDER BY i) FROM (
        SELECT DISTINCT UNNEST(x) AS i FROM (VALUES(s)) AS v(x)
      ) AS w WHERE i IS NOT NULL;
    $$
    LANGUAGE SQL IMMUTABLE PARALLEL SAFE`,

  `CREATE AGGREGATE array_union (ANYARRAY) (
    SFUNC = array_union_step,
    STYPE = ANYARRAY,
    FINALFUNC = array_union_final,
    INITCOND = '{}',
    PARALLEL = SAFE
  );
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
