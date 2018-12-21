'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `UPDATE
    contacts_attribute_defs
  SET
    enum_values = ARRAY[
      'General',
      'Unqualified Lead',
      'Qualified Lead',
      'Active',
      'Past Client'
    ]
  WHERE
    name = 'stage'`,
  'COMMIT'
]

const down = [
  'BEGIN',
  `UPDATE
    contacts_attribute_defs
  SET
    enum_values = NULL
  WHERE
    name = 'stage'`,
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
