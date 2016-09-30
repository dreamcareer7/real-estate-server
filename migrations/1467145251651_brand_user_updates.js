'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'ALTER TABLE brands ADD search_url text;',
  'ALTER TABLE brands ADD default_user uuid REFERENCES users(id);',
  'ALTER TABLE users ADD brand uuid REFERENCES brands(id);'
]

const down = [
  'ALTER TABLE brands DROP COLUMN search_url;',
  'ALTER TABLE brands DROP COLUMN default_user;',
  'ALTER TABLE users DROP COLUMN brand;'
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
