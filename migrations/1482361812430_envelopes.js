'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `CREATE TYPE envelope_status AS ENUM (
    'sent',
    'Sent',
    'Delivered',
    'Completed',
    'Declined',
    'Voided'
  )`,
  `CREATE TABLE envelopes (
    id uuid DEFAULT uuid_generate_v1() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone DEFAULT NOW(),
    created_by uuid NOT NULL REFERENCES users(id),
    deal uuid NOT NULL REFERENCES deals(id),
    docusign_id uuid UNIQUE,
    status envelope_status
  )`,
  `CREATE TYPE envelope_recipient_status AS ENUM (
    'Sent',
    'Delivered',
    'Completed',
    'Declined',
    'AuthenticationFailed',
    'AutoResponded'
  )`,
  `CREATE TABLE envelopes_recipients (
    id uuid DEFAULT uuid_generate_v1() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone DEFAULT NOW(),
    signed_at timestamp with time zone,
    envelope uuid NOT NULL REFERENCES envelopes(id),
    role deal_role NOT NULL,
    "user" uuid NOT NULL REFERENCES users(id),
    status envelope_recipient_status
  )`,
  'ALTER TYPE notification_action ADD VALUE \'ReactedTo\'',
  'ALTER TYPE notification_object_class ADD VALUE \'Recipient\'',
  'ALTER TYPE notification_object_class ADD VALUE \'Envelope\'',
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP TABLE envelopes_recipients',
  'DROP TABLE envelopes',
  'DROP TYPE envelope_status',
  'DROP TYPE envelope_recipient_status',
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
