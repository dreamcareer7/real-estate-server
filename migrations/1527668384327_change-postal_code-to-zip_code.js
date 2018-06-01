'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `UPDATE
    contacts_attribute_defs
  SET
    labels = ARRAY[
      'New Home',
      'Work Anniversary',
      'Wedding Anniversary',
      'Graduation Anniversary',
      'Newborn',
      'New Pet'
    ],
    singular = False,
    section = 'Dates'
  WHERE
    name = 'important_date'`,
  `UPDATE
    contacts_attribute_defs
  SET
    name = 'zip_code',
    label = 'Zip Code'
  WHERE
    name = 'postal_code'`,
  'COMMIT'
]

const down = [
  'BEGIN',
  `UPDATE
    contacts_attribute_defs
  SET
    name = 'postal_code',
    label = 'Postal Code'
  WHERE
    name = 'zip_code'`,
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
