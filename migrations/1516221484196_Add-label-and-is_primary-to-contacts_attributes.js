'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE contacts_attributes ADD label TEXT',
  'ALTER TABLE contacts_attributes ADD is_primary BOOLEAN DEFAULT FALSE',
  'ALTER TABLE contacts_emails ADD label TEXT',
  'ALTER TABLE contacts_emails ADD is_primary BOOLEAN DEFAULT FALSE',
  'ALTER TABLE contacts_phone_numbers ADD label TEXT',
  'ALTER TABLE contacts_phone_numbers ADD is_primary BOOLEAN DEFAULT FALSE',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE contacts_attributes DROP label',
  'ALTER TABLE contacts_attributes DROP is_primary',
  'ALTER TABLE contacts_emails DROP label',
  'ALTER TABLE contacts_emails DROP is_primary',
  'ALTER TABLE contacts_phone_numbers DROP label',
  'ALTER TABLE contacts_phone_numbers DROP is_primary',
  'COMMIT'
]

const runAll = (sqls, next) => {
  db.conn((err, client) => {
    if (err)
      return next(err)

    async.eachSeries(sqls, client.query.bind(client), err => {
      client.release()
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
