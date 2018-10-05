'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  `ALTER TABLE crm_associations
    DROP COLUMN touch,
    ADD COLUMN created_by uuid REFERENCES users(id),
    ADD COLUMN deleted_by uuid REFERENCES users(id),
    ADD COLUMN brand uuid REFERENCES brands(id),
    ADD COLUMN index integer,
    ADD COLUMN metadata json`,
  `UPDATE
    crm_associations ca
  SET
    brand = ct.brand,
    created_by = ct.created_by
  FROM
    crm_tasks ct
  WHERE
    ca.crm_task = ct.id`,
  `ALTER TABLE crm_associations
    ALTER COLUMN created_by SET NOT NULL,
    ALTER COLUMN brand SET NOT NULL`,
  'COMMIT'
]

const down = [
  'BEGIN',
  `ALTER TABLE crm_associations
    DROP COLUMN index
    DROP COLUMN metadata`,
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
