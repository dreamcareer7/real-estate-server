const db = require('../lib/utils/db')

const migrations = [
  'ALTER TYPE activity_type ADD VALUE \'UserSearchedListings\'',
  'ALTER TYPE activity_type ADD VALUE \'UserLoggedIn\'',
  'ALTER TYPE activity_type ADD VALUE \'UserLoggedOut\'',
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
