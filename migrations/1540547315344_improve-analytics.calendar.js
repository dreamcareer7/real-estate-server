'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')

const calendar_view = `
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
const get_contact_display_name = fs.readFileSync(__dirname + '/../lib/sql/contact/functions/get_contact_display_name.fn.sql', 'utf-8')
const get_deal_display_title = fs.readFileSync(__dirname + '/../lib/sql/calendar/get_deal_display_title.fn.sql', 'utf-8')
const deal_status_mask = fs.readFileSync(__dirname + '/../lib/sql/deal/functions/deal_status_mask.fn.sql', 'utf-8')

const up = [
  'BEGIN',
  'DROP VIEW IF EXISTS analytics.calendar',
  'DROP FUNCTION IF EXISTS get_contact_display_name(uuid)',
  'DROP FUNCTION IF EXISTS get_deal_display_title(uuid)',
  'DROP FUNCTION IF EXISTS deal_status_mask(uuid, text[])',

  deal_status_mask,
  get_deal_display_title,
  get_contact_display_name,
  calendar_view,
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP VIEW IF EXISTS analytics.calendar',
  'DROP FUNCTION IF EXISTS get_contact_display_name(uuid)',
  'DROP FUNCTION IF EXISTS get_deal_display_title(uuid)',
  'COMMIT'
]

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
