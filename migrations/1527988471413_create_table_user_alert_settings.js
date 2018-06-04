'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `CREATE TABLE user_alert_settings (
  id uuid PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4(),
  "user" uuid NOT NULL DEFAULT uuid_generate_v4() REFERENCES users(id),
  alert uuid NOT NULL DEFAULT uuid_generate_v4() REFERENCES alerts(id),
  status text[] NOT NULL DEFAULT ARRAY['AlertOpenHouse', 'AlertStatusChange', 'AlertPriceDrop', 'AlertHit'],
  CONSTRAINT unique_user_alert UNIQUE("user", alert)
  )`,
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP TABLE user_alert_settings',
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
