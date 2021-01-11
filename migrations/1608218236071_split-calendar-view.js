const db = require('../lib/utils/db')
const fs = require('fs')
const path = require('path')

const subviews = [
  'activity',
  'contact',
  'contact_attribute',
  'crm_association',
  'crm_task',
  'deal_context',
  'email_campaign_email_executed',
  'email_campaign_executed',
  'email_campaign_scheduled',
  'email_thread',
  'email_thread_recipient',
  'flow',
].flatMap(name => [
  `DROP VIEW IF EXISTS calendar.${name}`,
  fs.readFileSync(path.resolve('./lib/sql/calendar/subviews', `${name}.calendar.view.sql`), { encoding: 'utf-8' })
])

const migrations = [
  'BEGIN',
  'CREATE SCHEMA IF NOT EXISTS calendar',

  ...subviews,

  'DROP VIEW IF EXISTS calendar.home_anniversary',
  `CREATE OR REPLACE VIEW calendar.home_anniversary AS (
    SELECT
      cr.contact::text || ':' || cdc.id::text AS id,
      deals.created_by,
      cdc.created_at,
      cdc.created_at AS updated_at,
      cdc.deleted_at,
      deals.deleted_at AS parent_deleted_at,
      GREATEST(cdc.created_at, cdc.deleted_at) AS last_updated_at,
      'deal_context' AS object_type,
      'home_anniversary' AS event_type,
      'Home Anniversary' AS type_label,
      cdc."date" AS "timestamp",
      (timezone('UTC', date_trunc('day', cdc."date")) AT TIME ZONE 'UTC')::date AS "date",
      cast(cdc."date" + ((extract(year from age(cdc."date")) + 1) * interval '1 year') as date) AS next_occurence,
      NULL::timestamptz AS end_date,
      True AS recurring,
      deals.title,
      NULL::uuid AS crm_task,
      TRUE as all_day,
      cdc.deal,
      cr.contact,
      NULL::uuid AS campaign,
      NULL::uuid AS credential_id,
      NULL::text AS thread_key,
      NULL::uuid AS activity,
      NULL::uuid AS flow,
      (
        SELECT
          ARRAY_AGG(DISTINCT r."user")
        FROM
          deals_roles AS r
        WHERE
          r.deal = deals.id
          AND r.deleted_at IS NULL
          AND r."user" IS NOT NULL
      ) AS users,
      NULL::uuid[] AS accessible_to,
      (
        SELECT
          ARRAY_AGG(json_build_object(
            'id', contact,
            'type', 'contact'
          ))
        FROM
          contacts_roles
        WHERE
          role_name = 'Buyer'
          AND deal = deals.id
      ) AS people,
      NULL::int AS people_len,
      cr.brand,
      NULL::text AS status,
      NULL::jsonb AS metadata
    FROM
      current_deal_context cdc
      JOIN deals
        ON cdc.deal = deals.id
      JOIN brands_contexts bc
        ON bc.id = cdc.definition
      JOIN deals_checklists dcl
        ON dcl.id = cdc.checklist
      -- JOIN brands_checklists bcl
      --   ON dcl.origin = bcl.id
      JOIN contacts_roles cr
        ON (deals.id = cr.deal)
    WHERE
      deals.deleted_at IS NULL
      AND (
        (cdc.key = 'closing_date' AND cdc.date < NOW())
        OR cdc.key = 'lease_end'
      )
      AND cr.role_name = 'Buyer'
      AND deals.deal_type = 'Buying'
      -- AND bcl.deal_type = 'Buying'
      AND dcl.deleted_at     IS NULL
      AND dcl.deactivated_at IS NULL
      -- AND bcl.deleted_at     Is NULL
      AND dcl.terminated_at  IS NULL
      AND deals.faired_at    IS NOT NULL
      AND deal_status_mask(deals.id, '{Withdrawn,Cancelled,"Contract Terminated"}', cdc.key, '{expiration_date}'::text[], '{Sold,Leased}'::text[]) IS NOT FALSE
  )`,

  'DROP VIEW IF EXISTS analytics.calendar',
  fs.readFileSync(path.resolve('./lib/sql/calendar/calendar.view.sql'), { encoding: 'utf-8' }),

  fs.readFileSync(path.resolve('./lib/sql/trigger/triggers_due.view.sql'), { encoding: 'utf-8' }),

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
