'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE contacts_attributes ADD COLUMN IF NOT EXISTS attribute_type TEXT',
  `UPDATE
    contacts_attributes
  SET
    attribute_type = defs.name
  FROM
    contacts_attribute_defs AS defs
  WHERE
    contacts_attributes.attribute_def = defs.id`,
  'CREATE INDEX IF NOT EXISTS contacts_attributes_attribute_type ON contacts_attributes(attribute_type)',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE contacts_attributes DROP COLUMN attribute_type',
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
