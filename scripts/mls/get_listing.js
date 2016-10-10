#!/usr/bin/env node

const util = require('util')
const Client = require('./rets_client.js')

const program = require('./program.js')
  .option('--mui <n>', 'Get listing by its matrix unique id')

const options = program.parse(process.argv)

options.resource = 'OpenHouse'
options.class = 'OpenHouse'
options.dontSave = true
options.query = '(Listing_MUI=60635034)'
Client.work(options, report)

function report (cb, results) {
  console.log(util.inspect(results.mls[0]))
  process.exit()
}
