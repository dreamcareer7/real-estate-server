'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = ['ALTER TABLE notes ADD CONSTRAINT notes_pkey PRIMARY KEY(id);']
const down = ['ALTER TABLE notes DROP CONSTRAINT notes_pkey;']

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
