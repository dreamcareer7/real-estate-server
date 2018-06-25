'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE contacts ADD COLUMN display_name text',
  `UPDATE
    contacts
  SET
    display_name = get_contact_display_name(contacts.id)
  `,
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE contacts DROP COLUMN display_name',
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
