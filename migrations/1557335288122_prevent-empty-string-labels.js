const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `UPDATE
    contacts_attributes
  SET
    label = NULL
  WHERE
    label = ''`,
  'ALTER TABLE contacts_attributes ADD CHECK (label IS NULL OR LENGTH(label) > 0)',
  'COMMIT'
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
