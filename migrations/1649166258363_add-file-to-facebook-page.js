const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `ALTER TABLE facebook_pages
    ADD COLUMN instagram_profile_picture_file uuid REFERENCES files(id)`,
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
