'use strict'

const async = require('async')
const db = require('../lib/utils/db')

const up = [
  'ALTER TABLE deals_roles ADD commission float',
  'ALTER TABLE deals_roles ADD brokerwolf_id TEXT UNIQUE',
  `CREATE TABLE brokerwolf_agents(
    id TEXT PRIMARY KEY,
    object jsonb
  )`,
  `CREATE TABLE brokerwolf_agents_boards(
    agent_id TEXT REFERENCES brokerwolf_agents(id),
    mls_id TEXT,
    board_id TEXT
  )`,
  'ALTER TABLE brokerwolf_agents_boards ADD CONSTRAINT unique_brokerwolf_agents_board UNIQUE(agent_id, mls_id, board_id)'
  'ALTER TABLE deals ADD brokerwolf_transaction_id TEXT UNIQUE',
  'ALTER TABLE deals ADD brokerwolf_tier_id TEXT UNIQUE',
  `CREATE TABLE brokerwolf_property_types (
    property_type deal_property_type,
    brokerwolf_id TEXT NOT NULL UNIQUE,
    object jsonb NOT NULL
  )`
]

const down = [
  'ALTER TABLE deals_roles DROP commission',
  'ALTER TABLE deals_roles DROP brokerwolf_id',
  'DROP TABLE brokerwolf_agents',
  'DROP TABLE brokerwolf_agents_boards',
  'ALTER TABLE deals DROP brokerwolf_transaction_id',
  'ALTER TABLE deals DROP brokerwolf_tier_id',
  'DROP TABLE brokerwolf_property_types'
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
