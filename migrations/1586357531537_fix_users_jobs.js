const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  
  'ALTER TABLE users_jobs DROP CONSTRAINT users_jobs_microsoft_credential_fkey',

  'ALTER TABLE users_jobs ADD CONSTRAINT users_jobs_microsoft_credential_fkey FOREIGN KEY (microsoft_credential) REFERENCES microsoft_credentials(id)',

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
