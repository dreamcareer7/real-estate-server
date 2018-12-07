'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  `ALTER TYPE template_type
    ADD VALUE 'NewYear'`,

  `ALTER TYPE template_type
    ADD VALUE 'Christmas'`,

  `ALTER TYPE template_medium
    ADD VALUE 'FacebookCover'`,

  `ALTER TYPE template_medium
    ADD VALUE 'InstagramStory'`,
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
