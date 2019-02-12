'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')

const current_deal_context_fn = fs.readFileSync(__dirname + '/../lib/sql/deal/context/update_current_deal_context.fn.sql', 'utf-8')
const current_deal_context_trigger = fs.readFileSync(__dirname + '/../lib/sql/deal/context/update_current_deal_context.trigger.sql', 'utf-8')
const calendar = `
  CREATE OR REPLACE VIEW analytics.calendar AS (
    SELECT
      id,
      created_by,
      'crm_task' AS object_type,
      task_type AS event_type,
      task_type AS type_label,
      due_date AS "timestamp",
      False AS recurring,
      title,
      id AS crm_task,
      NULL::uuid AS deal,
      NULL::uuid AS contact,
      (
        SELECT
          ARRAY_AGG("user")
        FROM
          crm_tasks_assignees
        WHERE
          crm_task = crm_tasks.id
          AND deleted_at IS NULL
      ) AS users,
      brand,
      status
    FROM
      crm_tasks
    WHERE
      deleted_at IS NULL
    )
    UNION ALL
    (
      SELECT
        current_deal_context.id,
        deals.created_by,
        'deal_context' AS object_type,
        "key" AS event_type,
        NULL AS type_label,
        "date" AS "timestamp",
        False AS recurring,
        deals.title,
        NULL::uuid AS crm_task,
        deal,
        NULL::uuid AS contact,
        (
          SELECT
            ARRAY_AGG(r."user")
          FROM
            deals_roles AS r
          WHERE
            r.deal = deals.id
            AND r.deleted_at IS NULL
            AND r."user" IS NOT NULL
        ) AS users,
        brand,
        NULL::text AS status
      FROM
        current_deal_context
        JOIN deals
          ON current_deal_context.deal = deals.id
      WHERE
        deals.deleted_at IS NULL
        AND context_type = 'Date'::deal_context_type
        AND deal_status_mask(deals.id, '{Withdrawn,Cancelled,"Contract Terminated"}') IS NOT FALSE
    )
    UNION ALL
    (
      SELECT
        ca.id,
        contacts.created_by,
        'contact_attribute' AS object_type,
        COALESCE(cad.name, cad.label) AS event_type,
        (CASE
          WHEN attribute_type = 'birthday' THEN 'Birthday'
          WHEN attribute_type = 'child_birthday' THEN COALESCE('Child Birthday (' || ca.label || ')', 'Child Birthday')
          WHEN attribute_type = 'important_date' THEN COALESCE(ca.label, 'Important Date')
          ELSE COALESCE(cad.label, cad.name)
        END) AS type_label,
        "date" AS "timestamp",
        True AS recurring,
        (CASE WHEN ca.is_partner IS TRUE THEN contacts.partner_name ELSE contacts.display_name END) AS title,
        NULL::uuid AS crm_task,
        NULL::uuid AS deal,
        contact,
        ARRAY[contacts."user"] AS users,
        contacts.brand,
        NULL::text AS status
      FROM
        contacts
        JOIN contacts_attributes AS ca
          ON contacts.id = ca.contact
        JOIN contacts_attribute_defs AS cad
          ON ca.attribute_def = cad.id
      WHERE
        contacts.deleted_at IS NULL
        AND ca.deleted_at IS NULL
        AND cad.deleted_at IS NULL
        AND data_type = 'date'
    )
`

const up = [
  'BEGIN',
  'CREATE TABLE new_deal_context AS SELECT * FROM current_deal_context',
  'ALTER TABLE new_deal_context ADD PRIMARY KEY (id)',
  'ALTER TABLE new_deal_context ADD CONSTRAINT current_deal_context_deal FOREIGN KEY (deal) REFERENCES deals(id)',
  'ALTER TABLE new_deal_context ADD CONSTRAINT current_deal_context_approved_by FOREIGN KEY (approved_by) REFERENCES users(id)',
  'ALTER TABLE new_deal_context ADD CONSTRAINT current_deal_context_created_by FOREIGN KEY (created_by) REFERENCES users(id)',
  'ALTER TABLE new_deal_context ADD CONSTRAINT current_deal_context_revision FOREIGN KEY (revision) REFERENCES forms_data(id)',

  'CREATE INDEX current_deal_context_deal ON new_deal_context(deal)',
  'CREATE INDEX current_deal_context_key ON new_deal_context(key)',

  'DROP VIEW IF EXISTS analytics.calendar',
  'DROP VIEW IF EXISTS current_deal_context',
  'ALTER TABLE new_deal_context RENAME TO current_deal_context',
  current_deal_context_fn,
  current_deal_context_trigger,
  calendar,
  'COMMIT'
]

const down = []

const runAll = (sqls, next) => {
  db.conn((err, client, release) => {
    if (err)
      return next(err)

    async.eachSeries(sqls, client.query.bind(client), err => {
      release()
      next(err)
    })
  })
}

const run = (queries) => {
  return (next) => {
    runAll(queries, next)
  }
}

exports.up = run(up)
exports.down = run(down)
