const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'ALTER TABLE emails ADD COLUMN IF NOT EXISTS google_credential uuid REFERENCES google_credentials (id)',
  'ALTER TABLE emails ADD COLUMN IF NOT EXISTS microsoft_credential uuid REFERENCES microsoft_credentials (id)',

  `UPDATE
    emails
  SET
    google_credential = ec.google_credential,
    microsoft_credential = ec.microsoft_credential
  FROM
    email_campaigns AS ec
  WHERE
    emails.campaign = ec.id
  `,

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
