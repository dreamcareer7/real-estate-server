const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE TYPE lead_source_type
    AS ENUM('Zillow', 'Realtor')`,
  `CREATE TABLE lead_channels (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand uuid NOT NULL REFERENCES brands(id),
    "user" uuid NOT NULL REFERENCES users(id),
    source_type lead_source_type NOT NULL,
    capture_number numeric DEFAULT 0,
    last_capture_date timestamp,
    created_at timestamp DEFAULT CLOCK_TIMESTAMP(),
    updated_at timestamp DEFAULT CLOCK_TIMESTAMP(),
    deleted_at timestamp)
    `,
  `CREATE TABLE zillow_contacts (
    id uuid NOT NULL PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact uuid NOT NULL REFERENCES contacts(id),
    raw jsonb NOT NULL , 
    client_guid text NOT NULL    
  )`,
  `ALTER TABLE contacts
    ADD COLUMN lead_channel uuid REFERENCES lead_channels(id)`,
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
