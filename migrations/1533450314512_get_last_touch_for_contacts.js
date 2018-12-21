'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')
const path = require('path')

const sql_path = path.resolve(__dirname, '../lib/sql/crm/touch/get_last_touch_for_contacts.fn.sql')
const get_last_touch_for_contacts = fs.readFileSync(sql_path, 'utf-8')

const up = [
  'BEGIN',
  get_last_touch_for_contacts,
  `
  UPDATE
    contacts
  SET
    last_touch = ltc.last_touch
  FROM
    (
      SELECT
        array_agg(contact) AS ids
      FROM
        crm_associations
      WHERE
        deleted_at IS NULL
        AND contact IS NOT NULL
        AND touch IS NOT NULL
      GROUP BY
        touch
    ) AS cids,
    get_last_touch_for_contacts(cids.ids) as ltc
  WHERE
    contacts.id = ltc.contact
  `,
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP FUNCTION get_last_touch_for_contacts(uuid[])',
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
