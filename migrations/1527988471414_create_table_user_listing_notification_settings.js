'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `CREATE TABLE user_listing_notification_settings (
  id uuid PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4(),
  "user" uuid NOT NULL DEFAULT uuid_generate_v4() REFERENCES users(id),
  listing uuid NOT NULL DEFAULT uuid_generate_v4() REFERENCES listings(id),
  status text[] NOT NULL DEFAULT ARRAY['ListingOpenHouse', 'ListingStatusChange', 'ListingPriceDrop'],
  CONSTRAINT unique_user_listing UNIQUE("user", listing)
  )`,
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP TABLE user_listing_notification_settings',
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
