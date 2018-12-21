'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `UPDATE
    contacts_attribute_defs
  SET
    label = 'Marketing Name',
    name = 'marketing_name'
  WHERE
    name = 'formal_name'`,
  `UPDATE
    contacts_attributes
  SET
    attribute_type = 'marketing_name'
  WHERE
    attribute_type = 'formal_name'`,
  'COMMIT'
]

const down = [
  'BEGIN',
  `UPDATE
    contacts_attribute_defs
  SET
    label = 'Formal Name',
    name = 'formal_name'
  WHERE
    name = 'marketing_name'`,
  `UPDATE
    contacts_attributes
  SET
    attribute_type = 'formal_name'
  WHERE
    attribute_type = 'marketing_name'`,
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
