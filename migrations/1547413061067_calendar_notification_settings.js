'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `
    CREATE TYPE calendar_object_type AS ENUM (
      'crm_task',
      'deal_context',
      'contact_attribute'
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS calendar_notification_settings (
      id uuid PRIMARY KEY NOT NULL default uuid_generate_v4(),
      created_at timestamptz NOT NULL default CLOCK_TIMESTAMP(),
      updated_at timestamptz NOT NULL default CLOCK_TIMESTAMP(),
      deleted_at timestamptz,
      "user" uuid NOT NULL REFERENCES users(id),
      brand uuid REFERENCES brands(id),
      object_type calendar_object_type NOT NULL,
      event_type text NOT NULL,
      reminder interval NOT NULL,

      UNIQUE("user", object_type, event_type)
    )
  `,
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP TABLE IF EXISTS calendar_notification_settings',
  'DROP TYPE IF EXISTS calendar_object_type',
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
