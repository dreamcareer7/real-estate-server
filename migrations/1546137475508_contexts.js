'use strict'

const fs = require('fs')
const async = require('async')
const _ = require('lodash')
const db = require('../lib/utils/db')
const promisify = require('../lib/utils/promisify')
const contexts = require('./contexts.jss')

require('../lib/models')()

const cast = fs.readFileSync(__dirname + '/../lib/sql/deal/context/cast_context.fn.sql', 'utf-8')

const up = [
  'BEGIN',
  cast,
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
  `UPDATE deal_context SET definition = (
    SELECT id FROM brands_contexts WHERE key = deal_context.key
  )`,
]

const runAll = (sqls, cb) => {
  db.conn((err, client, release) => {
    if (err)
      return cb(err)

    async.eachSeries(sqls, client.query.bind(client), err => {
      release()
      cb(err, client)
    })
  })
}

const Flags = {
  'Buying': 1,
  'Selling': 2,

  'Resale': 128,
  'New Home': 256,
  'Lot / Land': 512,
  'Commercial Sale': 1024,
  'Residential Lease': 2048,
  'Commercial Lease': 4096,

  'Active Offer': 131072
}

const flags = num => {
  const conditions = []

  for(const condition in Flags) {
    if (num & Flags[condition])
      conditions.push(condition)
  }

  return conditions
}

const sql = `INSERT INTO brands_contexts(
  key, label, short_label, section, needs_approval, exports, preffered_source,
  default_value, format, data_type, required, optional, triggers_brokerwolf
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
RETURNING *`

const save = async (context, client) => {
  let section = context.section
  if (section === 'CriticalDates')
    section = 'Dates'

  const source = context.priority === 'MLS' ? 'MLS' : 'Provided'

  const required = flags(context.required)
  const optional = flags(context.optional)
  const show = flags(context.show_on_fact_sheel)

  if (!_.isEqual(show.sort(), optional.sort())) {
    console.log('Discrepancy on', context.name)
    console.log(show, optional)
    console.log('\n')
  }

  const values = [
    context.name,
    context.label,
    context.short_label,
    section,
    context.needs_approval,
    context.exports,
    source,
    context.default_value,
    context.format,
    context.type,
    required,
    optional,
    Boolean(context.triggers_brokerwolf)
  ]

  await promisify(client.query.bind(client))(sql, values)
}

const run = async (queries) => {
  const client = await promisify(runAll)(up)

  for(const name in contexts) {
    const context = {
      name,
      ...contexts[name]
    }

    await save(context, client)
  }

  await promisify(client.query.bind(client))('COMMIT')
}

module.exports = {}

module.exports.up = next => {
  run().then(next).catch(next)
}

module.exports.down = () => {}
