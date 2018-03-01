'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE brokerwolf_contact_types ADD roles deal_role[]',
  'UPDATE brokerwolf_contact_types SET roles = ARRAY[role]',
  'UPDATE brokerwolf_contact_types SET roles = NULL WHERE roles = \'{Null}\'',
  'ALTER TABLE brokerwolf_contact_types DROP role',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE brokerwolf_contact_types DROP roles',
  'ALTER TABLE brokerwolf_contact_types ADD role deal_role',
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
