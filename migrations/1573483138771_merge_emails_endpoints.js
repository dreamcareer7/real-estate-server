const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS headers JSON',

  'ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS google_credential    UUID',
  'ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS microsoft_credential UUID',

  'ALTER TABLE email_campaigns ADD CONSTRAINT email_campaigns_google_credential    FOREIGN KEY (google_credential)    REFERENCES google_credentials(id)',
  'ALTER TABLE email_campaigns ADD CONSTRAINT email_campaigns_microsoft_credential FOREIGN KEY (microsoft_credential) REFERENCES microsoft_credentials(id)',


  `CREATE TABLE IF NOT EXISTS email_campaign_attachments(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),

    email_campaign uuid NOT NULL REFERENCES email_campaigns(id),
    google_credential uuid NOT NULL REFERENCES google_credential(id),
    microsoft_credential uuid NOT NULL REFERENCES microsoft_credentials(id),
  
    file uuid NOT NULL REFERENCES files(id),

    file_name TEXT NOT NULL,
    link TEXT NOT NULL,
    type TEXT NOT NULL,
    is_inline BOOLEAN NOT NULL,
    content_id TEXT,
  
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz,

    UNIQUE (email_campaign, file)
  )`,

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
