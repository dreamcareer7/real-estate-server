'use strict'

const path = require('path')
const fs = require('fs')
const async = require('async')
const db = require('../lib/utils/db')

const sql_path = fn => path.resolve(__dirname, '../lib/sql/contact/list', fn + '.fn.sql')
const create_stage_lists_for_brand = fs.readFileSync(sql_path('create_stage_lists_for_brand'), 'utf-8')

const up = [
  'BEGIN',
  'ALTER TABLE contact_search_lists RENAME COLUMN "user" TO created_by',
  'ALTER TABLE contact_search_lists ALTER COLUMN created_by DROP NOT NULL',
  'ALTER TABLE contact_search_lists ADD COLUMN brand uuid',
  'DROP FUNCTION IF EXISTS create_stage_lists_for_user(uuid)',
  create_stage_lists_for_brand,
  'COMMIT'
]

const down = [
  'BEGIN',
  'ALTER TABLE contact_search_lists DROP COLUMN brand uuid NOT NULL',
  'ALTER TABLE contact_search_lists RENAME COLUMN created_by TO "user"',
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
