const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `UPDATE
    contacts
  SET
    display_name = ''
  FROM
    brands
  WHERE
    brands.id = contacts.brand
    AND contacts.display_name = 'Guest'
    AND brands.deleted_at IS NULL
    AND contacts.deleted_at IS NULL
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
