const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  // 'ALTER TABLE microsoft_credentials ADD CONSTRAINT microsoft_credential_subscription FOREIGN KEY (subscription) REFERENCES microsoft_subscriptions(id)',

  'ALTER TABLE microsoft_credentials ADD COLUMN last_hook_at timestamptz',

  'ALTER TABLE microsoft_sync_histories ADD COLUMN source TEXT DEFAULT \'api\'',


  `CREATE TABLE IF NOT EXISTS microsoft_subscriptions(
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),

    microsoft_credential uuid NOT NULL REFERENCES microsoft_credentials(id),
  
    subscription_id uuid NOT NULL,
    resource TEXT,
    change_type TEXT,
    client_state TEXT,
    notification_url TEXT,
    expiration_date_time TEXT,
    creator_id TEXT,
    application_id TEXT,
  
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    deleted_at timestamptz,

    UNIQUE (subscription_id),
    UNIQUE (microsoft_credential, subscription_id),
    UNIQUE (microsoft_credential, resource)
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
