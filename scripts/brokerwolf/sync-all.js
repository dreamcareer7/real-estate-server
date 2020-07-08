#!/usr/bin/env node

require('../connection.js')
const db = require('../../lib/utils/db')
const promisify = require('../../lib/utils/promisify')
const BrokerWolf = require('../../lib/models/BrokerWolf')
const Deal = require('../../lib/models/Deal')
const Context = require('../../lib/models/Context')


const syncMembers = async () => {
  const { rows } = await db.executeSql.promise('SELECT brand FROM brokerwolf_settings')

  for(const row of rows)
    await BrokerWolf.Members.sync(row.brand)
}

const syncDeals = async () => {
  const query = 'SELECT id FROM deals WHERE brokerwolf_id IS NULL AND deleted_at IS NULL'
  const { rows } = await db.executeSql.promise(query)
  const deal_ids = rows.map(row => row.id)
  Context.log('Found', deal_ids.length)

  const deals = await promisify(Deal.getAll)(deal_ids)

  let i = 0

  const errors = []

  for(const deal of deals) {
    i++
    Context.log(`${i}/${deals.length}`)

    try {
      await Deal.BrokerWolf.sync(deal)
    } catch(error) {
      errors.push({
        deal,
        error
      })
    }
  }

  Context.log('Errors', errors.length)

  for(const pair of errors) {
    const { deal, error } = pair

    Context.log(deal.id, Deal.getContext(deal, 'full_address'))
    Context.log(error.message)
    Context.log('----------------------------')
  }
}

const run = async () => {
  await syncMembers()
  await syncDeals()

  await promisify(MLSJob.insert)({
    name: 'sync_all'
  })

  process.exit()
}


run()
  .catch(e => {
    Context.log(e)
    process.exit()
  })

