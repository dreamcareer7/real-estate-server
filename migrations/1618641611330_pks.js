const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE password_recovery_records ADD PRIMARY KEY (id)',
  'ALTER TABLE phone_verifications ADD PRIMARY KEY (id)',
  'ALTER TABLE recommendations_eav ADD PRIMARY KEY (id)',
  'ALTER TABLE state_codes ADD COLUMN id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY',
  'ALTER TABLE websites_hostnames ADD PRIMARY KEY (id)',
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
