const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'ALTER TABLE brands_flow_steps ADD COLUMN "time" time',

  `UPDATE
    brands_flow_steps
  SET
    "time" = (wait_for - date_trunc('day', wait_for))::time
  `,

  `UPDATE
    brands_flow_steps
  SET
    wait_for = wait_for - "time"
  `,

  'ALTER TABLE brands_flow_steps ALTER COLUMN "time" SET NOT NULL',

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
