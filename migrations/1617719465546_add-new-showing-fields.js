const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE showings ADD COLUMN allow_appraisal boolean NOT NULL DEFAULT false',
  'ALTER TABLE showings ADD COLUMN allow_inspection boolean NOT NULL DEFAULT false',
  'ALTER TABLE showings ADD COLUMN instructions text',
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
