'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `UPDATE
    contacts_attribute_defs
  SET
    labels = NULL
  WHERE
    name NOT IN (
      'phone_number',
      'email',
      'important_date',
      'website',
      'street_name',
      'street_number',
      'street_prefix',
      'street_suffix',
      'unit_number',
      'city',
      'state',
      'country',
      'postal_code'
    )`,
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
