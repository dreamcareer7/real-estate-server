const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `ALTER TABLE facebook_credentials 
    ALTER COLUMN created_at TYPE timestamp,
    ALTER COLUMN updated_at TYPE timestamp
 `,
  `ALTER TABLE facebook_pages 
    ALTER COLUMN created_at TYPE timestamp,
    ALTER COLUMN updated_at TYPE timestamp,
    ALTER COLUMN deleted_at TYPE timestamp
   `,
  'ALTER TABLE facebook_pages RENAME COLUMN facebook_credential_id to facebook_credential',
  'ALTER TABLE facebook_pages DROP CONSTRAINT facebook_pages_facebook_instagram',
  'ALTER TABLE facebook_pages ADD CONSTRAINT facebook_pages_facebook_instagram UNIQUE (facebook_credential, instagram_business_account_id)',
  'COMMIT',
]

const run = async () => {
  const { conn } = await db.conn.promise()

  for (const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = (cb) => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
