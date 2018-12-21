'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'ALTER TABLE contacts_summaries ADD COLUMN brand uuid REFERENCES brands(id)',
  'ALTER TABLE contacts_summaries ALTER COLUMN "user" DROP NOT NULL',
  `UPDATE
    contacts_summaries AS cs
  SET
    brand = c.brand
  FROM
    contacts AS c
  WHERE
    cs.id = c.id`,
  'CREATE INDEX contacts_summaries_brand_idx ON contacts_summaries USING hash (brand)',
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE contacts_summaries DROP COLUMN brand',
  'COMMIT'
]

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
