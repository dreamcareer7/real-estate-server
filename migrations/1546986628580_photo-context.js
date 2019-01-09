'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  `INSERT INTO brands_contexts (brand, key, label, preffered_source, data_type, "order")
  VALUES ((SELECT brand FROM brands_contexts LIMIT 1), 'photo', 'Photo', 'Provided', 'Text', 0)`
]

const down = []

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
