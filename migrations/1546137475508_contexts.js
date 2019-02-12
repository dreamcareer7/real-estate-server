'use strict'

const async = require('async')
const db = require('../lib/utils/db')

require('../lib/models')()

const up = [
  'BEGIN',
  `CREATE TYPE deal_context_section AS ENUM (
    'Listing', 'CDA', 'Dates'
  )`,
  `CREATE TYPE deal_context_source AS ENUM (
    'Provided', 'MLS'
  )`,
  `CREATE TYPE deal_context_condition AS ENUM (
    'Buying',
    'Selling',

    'Resale',
    'New Home',
    'Lot / Land',
    'Residential Lease',
    'Commercial Sale',
    'Commercial Lease',

    'Active Offer'
  )`,
  `CREATE TYPE deal_context_format AS ENUM (
    'Currency'
  )`,
  `CREATE TABLE brands_contexts (
    id uuid NOT NULL DEFAULT uuid_generate_v1() PRIMARY KEY,
    brand uuid REFERENCES brands(id),
    key text NOT NULL,
    label text NOT NULL,
    short_label TEXT,
    section deal_context_section,
    needs_approval boolean,
    exports boolean,
    preffered_source deal_context_source DEFAULT 'Provided' NOT NULL,
    default_value TEXT,
    data_type deal_context_type,
    format deal_context_format,
    required deal_context_condition[],
    optional deal_context_condition[],
    triggers_brokerwolf boolean DEFAULT FALSE NOT NULL
   )`,
  'ALTER TABLE deal_context ADD definition uuid REFERENCES brands_contexts(id)',
  'ALTER TABLE deal_context RENAME context_type TO data_type',
  'COMMIT'
]

const down = []

const runAll = (sqls, cb) => {
  db.conn((err, client, release) => {
    if (err)
      return cb(err)

    async.eachSeries(sqls, client.query.bind(client), err => {
      cb(err, client)
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
