const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `UPDATE contacts_attribute_defs SET show = TRUE WHERE global AND name = ANY('{
    wedding_anniversary,
    home_anniversary,
    work_anniversary,
    child_birthday,
    facebook,
    instagram,
    linkedin
  }'::text[])`,
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
