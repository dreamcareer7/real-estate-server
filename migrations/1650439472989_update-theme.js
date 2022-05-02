const db = require('../lib/utils/db')

const migrations = [
  'ALTER TYPE theme ADD ATTRIBUTE "navbar-button-main"          TEXT',
  'ALTER TYPE theme ADD ATTRIBUTE "navbar-button-light"         TEXT',
  'ALTER TYPE theme ADD ATTRIBUTE "navbar-button-dark"          TEXT',
  'ALTER TYPE theme ADD ATTRIBUTE "navbar-button-contrast-text" TEXT',
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
