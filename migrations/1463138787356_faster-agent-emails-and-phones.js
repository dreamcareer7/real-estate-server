'use strict'

const async = require('async')
const db = require('../lib/utils/db')
const fs = require('fs')
const phones = fs.readFileSync('./lib/sql/agent/agents_phones.mv.sql').toString()
const emails = fs.readFileSync('./lib/sql/agent/agents_emails.mv.sql').toString()

const up = [
  'DROP MATERIALIZED VIEW agents_phones',
  phones,
  'DROP MATERIALIZED VIEW agents_emails',
  emails
]

const down = []

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
