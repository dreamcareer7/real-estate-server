#!/usr/bin/env node

require('../connection.js')
const Deal = require('../../lib/models/Deal')
const promisify = require('../../lib/utils/promisify')

const run = async () => {
  const deal = await promisify(Deal.get)(process.argv[2])

  await Deal.notify({deal})
}

run()
  .then(process.exit)
  .catch(e => {
    console.log(e)
    process.exit()
  })
