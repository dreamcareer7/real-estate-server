#!/usr/bin/env node

require('../connection.js')
require('../../lib/models/index.js')
const request = require('request-promise-native')

const promisify = require('../../lib/utils/promisify')

const sync = async () => {
  const deal = await promisify(Deal.get)(process.argv[2])

  const uri = `/wolfconnect/transactions/v1/${deal.brokerwolf_id}`
  const method = 'GET'

  const options = {
    method,
    uri,
    json: true,
    brand: deal.brand
  }

  const req = await BrokerWolf.tokenize(options)

  const tr = await request(req)

  console.log(require('util').inspect(tr, {depth: 10}))

  process.exit()
}

sync()
  .catch(e => {
    console.log(e)
    process.exit()
  })
