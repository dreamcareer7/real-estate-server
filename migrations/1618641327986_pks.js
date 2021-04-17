const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE brands_offices ADD PRIMARY KEY (id)',
  'ALTER TABLE default_brands ADD PRIMARY KEY (id)',
  'ALTER TABLE email_verifications ADD PRIMARY KEY (id)',
  'ALTER TABLE godaddy_domains ADD PRIMARY KEY (id)',
  'ALTER TABLE migrations ADD COLUMN id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY',
  'ALTER TABLE mls_jobs ADD PRIMARY KEY (id)',
  'ALTER TABLE open_houses ADD PRIMARY KEY (id)',
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
