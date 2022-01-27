#!/usr/bin/env node

require('../connection.js')
const { sync } = require('../../lib/models/Deal/MoveEasy')
const Brand = require('../../lib/models/Brand/get')
const Deal = require('../../lib/models/Deal/get')
const promisify = require('../../lib/utils/promisify')

const run = async () => {
  const deal = await promisify(Deal.get)(process.argv[2])
  const parents = await Brand.getParents(deal.brand)

  await sync(deal, parents)
}

run()
  .then(process.exit)
  .catch(e => {
    console.log(e)
    process.exit()
  })
