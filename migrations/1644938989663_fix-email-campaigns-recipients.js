const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',
  `
  WITH problematic_triggers as (
    SELECT t.id, t.scheduled_after, t.campaign
      FROM
        triggers t
      JOIN email_campaigns ec
        ON t.campaign = ec.id
    WHERE NOT EXISTS (SELECT 1
      FROM email_campaigns_recipients AS ecr
      WHERE ecr.campaign = ec.id
    )
  ),
  parent_triggers as (
    SELECT
      t.id, t.brand, t.campaign,
      ec.from, ecr.tag, ecr.list, ecr.contact,
      ecr.email, ecr.send_type, ecr.recipient_type,
      ecr.agent
    FROM
      triggers t
    JOIN email_campaigns ec
      ON ec.id = t.campaign
    JOIN email_campaigns_recipients ecr
      ON ecr.campaign = ec.id
    WHERE
      t.id in (SELECT scheduled_after FROM problematic_triggers)
  )
  INSERT
    INTO email_campaigns_recipients
      (campaign, tag, list, contact, email, brand, send_type, recipient_type, agent)
  SELECT
    probt.campaign, pat.tag, pat.list, pat.contact, pat.email, pat.brand, pat.send_type, pat.recipient_type, agent
  FROM
    parent_triggers pat
  JOIN
    problematic_triggers probt
  ON
    pat.id = probt.scheduled_after  
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
