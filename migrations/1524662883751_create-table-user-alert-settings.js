'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  ` CREATE TYPE user_alert_setting_status_type AS ENUM (
    'Enabled',
    'Disabled'
    );
    
    CREATE TABLE user_alert_settings(
    "user" uuid not null references users(id),
    alert uuid not null references alerts(id),
    status user_alert_setting_status_type not null default 'Enabled',
    created_at timestamp with time zone not null DEFAULT clock_timestamp() ,
    updated_at timestamp with time zone not null DEFAULT clock_timestamp(),
    PRIMARY KEY("user", alert)
  )`,
  'COMMIT'
]

const down = [
  'BEGIN',
  `DROP TABLE user_alert_settings;
   DROP TYPE user_alert_setting_status_type`,
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
