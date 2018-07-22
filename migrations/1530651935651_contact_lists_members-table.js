'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'BEGIN',
  'DROP TABLE IF EXISTS contact_lists_members',
  `CREATE TABLE contact_lists_members (
    list uuid REFERENCES contact_search_lists(id) NOT NULL,
    contact uuid REFERENCES contacts(id) NOT NULL,
    is_manual boolean NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
  )`,
  'ALTER TABLE contact_lists_members ADD PRIMARY KEY (list, contact)',
  'COMMIT'
]

const down = [
  'BEGIN',
  'DROP TABLE IF EXISTS contact_lists_members',
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
