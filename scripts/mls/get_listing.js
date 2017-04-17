#!/usr/bin/env node

const util = require('util')
const Client = require('./rets_client.js')

const program = require('./program.js')
  .option('--mui <n>', 'Get listing by its matrix unique id')
  .option('--mls <n>', 'Get listing by its MLS number')

const options = program.parse(process.argv)

options.resource = 'Property'
options.class = 'Listing'
options.dontSave = true
if (options.mui)
  options.query = `(Matrix_Unique_ID=${options.mui})`
if (options.mls)
  options.query = `(MLSNumber=${options.mls})`

Client.work(options, report)

function report (cb, results) {
  console.log(util.inspect(results))
  process.exit()
}
