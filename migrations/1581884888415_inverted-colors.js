const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TYPE palette ADD ATTRIBUTE "inverted-button-bg-color" TEXT',
  'ALTER TYPE palette ADD ATTRIBUTE "inverted-button-text-color" TEXT',
  'ALTER TYPE palette ADD ATTRIBUTE "inverted-light-text-color" TEXT',
  'ALTER TYPE palette ADD ATTRIBUTE "inverted-h1-text-color" TEXT',
  'ALTER TYPE palette ADD ATTRIBUTE "inverted-h2-text-color" TEXT',
  'ALTER TYPE palette ADD ATTRIBUTE "inverted-h3-text-color" TEXT',
  'ALTER TYPE palette ADD ATTRIBUTE "inverted-logo-wide" TEXT',
  'ALTER TYPE palette ADD ATTRIBUTE "inverted-logo-square" TEXT',
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
