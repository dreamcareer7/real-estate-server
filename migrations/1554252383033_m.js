const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `UPDATE deal_context SET checklist = (SELECT id FROM deals_checklists WHERE deal = deal_context.deal)
    WHERE deal IN (
      SELECT deal FROM deals_checklists GROUP BY deal HAVING count(*) < 2
    )`,
  'COMMIT',
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
