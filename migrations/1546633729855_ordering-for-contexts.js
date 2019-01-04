'use strict'

const _ = require('lodash')
const db = require('../lib/utils/db')
const promisify = require('../lib/utils/promisify')
const contexts = require('./contexts.jss')

require('../lib/models')()


const Flags = {
  'Selling': 1,
  'Buying': 2,

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
  key, label, short_label, "order", section, needs_approval, exports, preffered_source,
  default_value, format, data_type, required, optional, triggers_brokerwolf
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
RETURNING *`

const save = async (context, client) => {
  let section = context.section
  if (section === 'CriticalDates')
    section = 'Dates'

  const source = context.priority === 'MLS' ? 'MLS' : 'Provided'

  const required = flags(context.required)
  let optional = flags(context.optional)
  const show = flags(context.show_on_fact_sheet)

  if (optional.length < 1)
    optional = show

  if (!_.isEqual(show.sort(), optional.sort())) {
    console.log('Discrepancy on', context.name)
    console.log(show, optional)
    console.log('\n')
  }

  const values = [
    context.name,
    context.label,
    context.short_label,
    context.order,
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
  const client = await promisify(db.conn)()

  await client.query('BEGIN')


  await client.query('TRUNCATE TABLE brands_contexts CASCADE')

  await client.query(`ALTER TABLE brands_contexts ADD "order" integer NOT NULL`)

  let order = 0

  for(const name in contexts) {
    order++

    const context = {
      name,
      order,
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
