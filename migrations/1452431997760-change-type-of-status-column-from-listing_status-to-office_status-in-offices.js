'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = ['ALTER TABLE offices ALTER COLUMN status TYPE text USING status::text;' +
          'ALTER TABLE offices ALTER COLUMN status TYPE office_status USING status::office_status;']

const down = ['ALTER TABLE offices ALTER COLUMN status TYPE text USING status::text;' +
            'ALTER TABLE offices ALTER COLUMN status TYPE listing_status USING status::listing_status;']

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
