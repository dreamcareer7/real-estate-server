const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE OR REPLACE FUNCTION range_contains_imd(low date, high date, d int)
    RETURNS boolean
    IMMUTABLE PARALLEL SAFE STRICT
    LANGUAGE plpgsql
    AS $$
      DECLARE
        lb int := indexable_month_day($1);
        hb int := indexable_month_day($2);
      BEGIN
        IF lb > hb THEN
          RETURN (d BETWEEN lb AND 1231) OR (d BETWEEN 101 AND hb);
        ELSE
          RETURN (d BETWEEN lb AND hb);
        END IF;
      END;
    $$`,
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
