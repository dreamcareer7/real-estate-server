'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')

const get_contact_summaries = fs.readFileSync(__dirname + '/../lib/sql/contact/functions/get_contact_summaries.fn.sql', 'utf-8')
const get_contact_display_name = fs.readFileSync(__dirname + '/../lib/sql/contact/functions/get_contact_display_name.fn.sql', 'utf-8')

const up = [
  'BEGIN',
  'DROP FUNCTION get_contact_summaries(uuid[])',
  get_contact_summaries,
  get_contact_display_name,
  `UPDATE
    contacts
  SET
    display_name = get_contact_display_name(contacts.id)
  WHERE
    id IN (
      SELECT
        contact
      FROM
        contacts_attributes
      WHERE
        attribute_type = 'marketing_name'
    )
  `,
  'COMMIT'
]

const down = [
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
