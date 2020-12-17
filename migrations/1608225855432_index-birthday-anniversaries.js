const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  `CREATE OR REPLACE FUNCTION indexable_month_day(DATE)
    RETURNS INT
    IMMUTABLE PARALLEL SAFE STRICT
    LANGUAGE SQL
    AS $$
      SELECT date_part('month', $1)::int * 100 + date_part('day', $1)::int
    $$`,

    'CREATE INDEX contacts_attributes_date_month_day_idx ON contacts_attributes_date (indexable_month_day(date))',

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
