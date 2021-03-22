const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE godaddy_domains RENAME order_id TO "order"',
  'ALTER TABLE godaddy_domains RENAME hosted_zone TO zone',
  'ALTER TABLE godaddy_domains ADD COLUMN charge uuid NOT NULL REFERENCES stripe_charges(id)',
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
