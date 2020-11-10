const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE brands_flow_steps RENAME COLUMN due_in TO wait_for',
  `ALTER TABLE brands_flow_steps
    ADD COLUMN "order" smallint,
    ADD COLUMN event_type text NOT NULL DEFAULT 'flow_start',
    ADD COLUMN template uuid REFERENCES templates(id),
    ADD COLUMN template_instance uuid REFERENCES templates_instances(id)`,

  `ALTER TABLE flows_steps
    DROP COLUMN email,
    DROP COLUMN event,

    ADD COLUMN crm_task uuid REFERENCES crm_tasks(id),
    ADD COLUMN campaign uuid REFERENCES email_campaigns(id)`,

  // fix order value and add not null and unique constraints
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
