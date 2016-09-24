const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'CREATE TABLE IF NOT EXISTS notifications_deliveries(id uuid DEFAULT uuid_generate_v1() PRIMARY KEY, \
"user" uuid NOT NULL REFERENCES users(id), \
"notification" uuid NOT NULL REFERENCES notifications(id), \
"device_token" text,\
"type" text,\
created_at timestamptz DEFAULT NOW(), updated_at timestamptz DEFAULT NOW(), deleted_at timestamptz);'
]

const down = [
  'DROP TABLE IF EXISTS notifications_deliveries'
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
