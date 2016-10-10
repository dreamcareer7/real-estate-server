'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'ALTER TABLE listings ALTER dom TYPE int USING null',
  'ALTER TABLE listings ALTER cdom TYPE int USING null',
  'UPDATE listings SET \
    dom = ( \
      CASE WHEN LENGTH(mls_data.value->>\'DOM\') > 0 THEN (mls_data.value->>\'DOM\')::int ELSE NULL END \
    ), \
    cdom = ( \
      CASE WHEN LENGTH(mls_data.value->>\'CDOM\') > 0 THEN (mls_data.value->>\'CDOM\')::int ELSE NULL END \
    ) \
  FROM mls_data \
  WHERE listings.matrix_unique_id = mls_data.matrix_unique_id;'
]

const down = [
  'ALTER TABLE listings ALTER dom TYPE timestamp with time zone USING null',
  'ALTER TABLE listings ALTER cdom TYPE timestamp with time zone USING null'
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
