'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'DROP TABLE brands_rooms',
  'ALTER TABLE rooms_users ADD reference TEXT',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE rooms_users DROP reference',
  `CREATE TABLE brands_rooms (
     id uuid DEFAULT uuid_generate_v1() NOT NULL,
     "user" uuid NOT NULL REFERENCES users(id),
     room uuid NOT NULL REFERENCES rooms(id),
     brand uuid NOT NULL REFERENCES brands(id)
  )`,
  'COMMIT'
]

const runAll = (sqls, next) => {
  db.conn((err, client) => {
    if (err)
      return next(err)

    async.eachSeries(sqls, client.query.bind(client), next)
  })
}

const run = (queries) => {
  return (next) => {
    runAll(queries, next)
  }
}

exports.up = run(up)
exports.down = run(down)
