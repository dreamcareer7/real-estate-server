const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  'ALTER TABLE brands_flow_steps RENAME COLUMN due_in TO wait_for',
  `ALTER TABLE brands_flow_steps
    ADD COLUMN "order" smallint,
    ADD COLUMN event_type text NOT NULL DEFAULT 'flow_start',
    ADD COLUMN template uuid REFERENCES templates(id),
    ADD COLUMN "time" time,
    ADD COLUMN template_instance uuid REFERENCES templates_instances(id)`,

  `UPDATE
    brands_flow_steps
  SET
    "time" = (wait_for - date_trunc('day', wait_for))::time
  `,

  `UPDATE
    brands_flow_steps
  SET
    wait_for = wait_for - "time"
  `,

  'ALTER TABLE brands_flow_steps ALTER COLUMN "time" SET NOT NULL',

  `ALTER TABLE flows_steps
    ADD COLUMN executed_at timestamptz,
    ADD COLUMN failed_at timestamptz,
    ADD COLUMN failed_within text,
    ADD COLUMN failure text,
    ADD COLUMN crm_task uuid REFERENCES crm_tasks(id),
    ADD COLUMN campaign uuid REFERENCES email_campaigns(id)`,

  `UPDATE
    flows_steps
  SET
    crm_task = flows_events.crm_task
  FROM
    flows_events
  WHERE
    flows_steps.event = flows_events.id`,

  `UPDATE
    flows_steps
  SET
    campaign = flows_emails.email
  FROM
    flows_emails
  WHERE
    flows_steps.email = flows_emails.id`,

  `ALTER TABLE flows_steps
    DROP COLUMN email,
    DROP COLUMN event`,

  `ALTER TABLE flows
    ADD COLUMN stopped_at timestamptz,
    ADD COLUMN last_step_date timestamptz`,

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
