const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE de.admins_offices DROP CONSTRAINT admins_offices_username_fkey',
  'ALTER TABLE de.admins_offices ADD CONSTRAINT admins_offices_username_fkey FOREIGN KEY(username) REFERENCES de.users(username) ON UPDATE CASCADE',

  'ALTER TABLE de.agents_offices DROP CONSTRAINT agents_offices_username_fkey',
  'ALTER TABLE de.agents_offices ADD CONSTRAINT agents_offices_username_fkey FOREIGN KEY(username) REFERENCES de.users(username) ON UPDATE CASCADE',


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
