const db = require('../lib/utils/db')

const migrations = [
  `CREATE TYPE contact_action_reason AS ENUM (
    'direct_request',
    'deals',
    'import_csv',
    'import_json',
    'merge',
    'deleted_definition',
    'google_integration',
    'system'
  )`
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
