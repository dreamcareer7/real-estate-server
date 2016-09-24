'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'ALTER TABLE brands ADD search_bg_image_url text',
  'ALTER TABLE brands ADD search_headline text'
]

const down = [
  'ALTER TABLE brands DROP search_bg_image_url',
  'ALTER TABLE brands DROP search_headline'
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
