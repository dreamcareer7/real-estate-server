'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'CREATE TYPE user_image_type AS ENUM(\'Profile\', \'Cover\')',
  'CREATE TABLE agents_images( id uuid DEFAULT uuid_generate_v1() PRIMARY KEY, mui bigint, url text, image_type user_image_type, date timestamp with time zone)'
]

const down = [
  'DROP TABLE agents_images',
  'DROP TYPE user_image_type'
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
