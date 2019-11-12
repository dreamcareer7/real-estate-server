const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `UPDATE
    contacts
  SET
    last_touch = crm_last_touches.last_touch
  FROM
    crm_last_touches
  WHERE
    contacts.id = crm_last_touches.contact`,
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
