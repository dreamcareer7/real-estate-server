const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE TABLE super_campaigns (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at timestamp NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamp DEFAULT clock_timestamp(),
    deleted_at timestamp,
    created_by uuid REFERENCES users (id),
    brand uuid not null REFERENCES brands (id),
    executed_at timestamp,
    due_at timestamp,
    subject text,
    template_instance uuid REFERENCES templates_instances (id)
  )`,

  `CREATE TABLE super_campaigns_recipients (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at timestamp DEFAULT clock_timestamp(),
    updated_at timestamp DEFAULT clock_timestamp(),
    deleted_at timestamp,
    super_campaign uuid NOT NULL REFERENCES super_campaigns (id),
    tags text[] NOT NULL,
    brand uuid REFERENCES brands (id),
  
    UNIQUE (super_campaign, brand, tags)
  )`,

  'CREATE INDEX super_campaigns_recipients_campaign_idx ON super_campaigns_recipients (super_campaign)',

  `CREATE TABLE super_campaigns_enrollments (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at timestamp DEFAULT clock_timestamp(),
    updated_at timestamp DEFAULT clock_timestamp(),
    deleted_at timestamp,
  
    super_campaign uuid NOT NULL REFERENCES super_campaigns (id),
    brand uuid REFERENCES brands (id),
    "user" uuid REFERENCES users (id),
    tags text[] NOT NULL,
  
    UNIQUE (super_campaign, brand, "user")
  )`,
  'CREATE INDEX super_campaigns_enrollments_campaign_brand_idx ON super_campaigns_enrollments (super_campaign, brand)',

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
