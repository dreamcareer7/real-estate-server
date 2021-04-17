const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE attachments_eav ADD PRIMARY KEY (id)',
  'ALTER TABLE brands_form_templates ADD PRIMARY KEY (id)',
  'ALTER TABLE brands_hostnames ADD PRIMARY KEY (id)',
  'ALTER TABLE brokerwolf_agents_boards ADD COLUMN id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY',
  'ALTER TABLE brokerwolf_contact_types ADD COLUMN id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY',
  'ALTER TABLE brokerwolf_classifications ADD COLUMN id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY',
  'ALTER TABLE brokerwolf_property_types ADD COLUMN id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY',
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
