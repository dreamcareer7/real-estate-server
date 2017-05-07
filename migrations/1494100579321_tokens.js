'use strict'

const async = require('async')
const db = require('../lib/utils/db')

/*
Our clients table in the backend at the moment has several clients with the same ID (and different version).
This now has to change as we need to associate each token with a single version of the app.
But due to the fact that we current have apps with same id, and many of those apps are in circulation,
we cannot remove them (or change ID's).
I'm not going to make proper database constrains to prevent this issue
With that being said, in a few version (and once old client id's are out of circulation),
we can create the proper database constraints.
*/

const up = [
  'BEGIN',
  'CREATE TYPE token AS ENUM(\'access\', \'refresh\')',
  `CREATE TABLE tokens (
    id uuid DEFAULT uuid_generate_v1() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT NOW(),
    expires_at timestamp with time zone,
    client uuid NOT NULL,
    "user" uuid REFERENCES users(id),
    token text UNIQUE DEFAULT encode(uuid_generate_v1()::text::bytea, 'base64'),
    token_type token NOT NULL
  )`,
  'CREATE TYPE client_status AS ENUM(\'UpgradeUnavailable\', \'UpgradeAvailable\', \'UpgradeRequired\')',
  'ALTER TABLE clients ADD status client_status NOT NULL DEFAULT \'UpgradeUnavailable\'',
]

const down = [
  'BEGIN',
  'DROP TABLE tokens',
  'DROP TYPE token',
  'DROP TYPE client_status',
  'ALTER TABLE clients DROP COLUMN status',
  'COMMIT'
]

const config = require('../lib/config')
const Redis = require('redis')
const redis = Redis.createClient(config.redis.url)

function moveAll(db, cb) {
  redis.keys('*', (err, keys) => {
    if (err)
      return cb(err)

    const tokens = keys.filter(key => key.length === 48)
    async.eachSeries(tokens, move.bind(null, db), cb)
  })
}

const query = 'INSERT INTO tokens (expires_at, client, "user", token, token_type) VALUES ($1, $2, $3, $4, $5)'
function move(db, token, cb) {
  const save = (cb, results) => {
    let expires_at = null
    if (results.ttl > 0)
      expires_at = new Date((Number(new Date)) + (results.ttl * 1000))

    db.query(query, [
      expires_at,
      results.info.client_id,
      results.info.user_id,
      token,
      results.info.type
    ], cb)
  }

  async.auto({
    info: cb => redis.hgetall(token, cb),
    ttl: cb => redis.ttl(token, cb),
    save: ['info', 'ttl', save]
  }, cb)
}

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

exports.up = next => {
  db.conn((err, client) => {
    if (err)
      return next(err)

    async.eachSeries(up, client.query.bind(client), err => {
      if (err)
        return next(err)

      moveAll(client, err => {
        if (err)
          return next(err)

        client.query('COMMIT', next)
      })
    })
  })
}
exports.down = run(down)
