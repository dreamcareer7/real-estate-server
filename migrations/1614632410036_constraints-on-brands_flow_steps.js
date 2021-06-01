const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `WITH orders AS (
    SELECT
      id,
      row_number() OVER (partition by flow order by wait_for) AS "order"
    FROM
      brands_flow_steps
  )
  UPDATE
    brands_flow_steps
  SET
    "order" = orders.order
  FROM
    orders
  WHERE
    brands_flow_steps.id = orders.id
  `,
  'ALTER TABLE brands_flow_steps ADD CONSTRAINT brands_flow_steps_unique_step_order UNIQUE (flow, "order") DEFERRABLE INITIALLY IMMEDIATE',
  'ALTER TABLE brands_flow_steps ALTER "order" SET NOT NULL',
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
