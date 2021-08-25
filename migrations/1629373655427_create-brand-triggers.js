const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `CREATE TABLE brand_triggers (
    id uuid PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4(),

    created_by uuid NOT NULL REFERENCES users (id),

    brand uuid NOT NULL REFERENCES brands (id),
    template uuid REFERENCES templates (id),
    template_instance uuid REFERENCES templates_instances (id),

    event_type text NOT NULL,
    wait_for interval NOT NULL,
    subject text NOT NULL,

    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now(),
    deleted_at timestamp,

    CONSTRAINT bt_template_xor_template_instance CHECK (num_nonnulls(template, template_instance) = 1)
  )`,
  `CREATE UNIQUE INDEX bt_unique_by_brand_and_event_type
    ON brand_triggers (brand, event_type)`,
  'COMMIT',
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
