const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS headers JSON',

  'ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS google_credential    UUID',
  'ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS microsoft_credential UUID',

  'ALTER TABLE email_campaigns ADD CONSTRAINT email_campaigns_google_credential    FOREIGN KEY (google_credential)    REFERENCES google_credentials(id)',
  'ALTER TABLE email_campaigns ADD CONSTRAINT email_campaigns_microsoft_credential FOREIGN KEY (microsoft_credential) REFERENCES microsoft_credentials(id)',

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
