'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = ['ALTER TABLE google_tokens\
                ADD CONSTRAINT google_tokens_users_fkey FOREIGN KEY(\"user\")\
                REFERENCES users (id) MATCH SIMPLE\
                ON UPDATE NO ACTION ON DELETE NO ACTION;']

const down = 'ALTER TABLE units DROP CONSTRAINT google_tokens_users_fkey;'

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
