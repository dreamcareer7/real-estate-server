'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  `CREATE TYPE deal_ender_type AS ENUM (
    'Selling', 'Buying', 'AgentDoubleEnder', 'OfficeDoubleEnder'
  )`,
  `CREATE TABLE brokerwolf_classifications (
    brokerwolf_id TEXT NOT NULL UNIQUE,
    ender_type deal_ender_type,
    object jsonb NOT NULL
  )`,
  `CREATE TABLE brokerwolf_contact_types (
    brokerwolf_id TEXT NOT NULL UNIQUE,
    role deal_role,
    object jsonb NOT NULL
  )`,
  'ALTER TABLE deals ADD brokerwolf_id TEXT UNIQUE',
  'ALTER TABLE deals ADD brokerwolf_row_version INTEGER',
  'ALTER TABLE deals_roles ADD brokerwolf_row_version INTEGER'
]

const down = [
  'DROP TABLE brokerwolf_classifications',
  'DROP TABLE brokerwolf_contact_types',
  'ALTER TABLE deals DROP brokerwolf_id',
  'ALTER TABLE deals DROP brokerwolf_row_version',
  'DROP TYPE deal_ender_type',
  'ALTER TABLE deals_roles DROP brokerwolf_row_version'
]

const runAll = (sqls, next) => {
  db.conn((err, client) => {
    if (err)
      return next(err)

    async.eachSeries(sqls, client.query.bind(client), err => {
      client.release()
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
