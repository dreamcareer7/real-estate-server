#!/usr/bin/env node

const util = require('util')
const Client = require('./rets_client.js')

const program = require('./program.js')
  .option('--mui <n>', 'Get listing by its matrix unique id')

const options = program.parse(process.argv)

options.resource = 'Property'
options.class = 'Listing'
options.dontSave = true
options.query = '(Matrix_Unique_ID=' + options.mui + ')'
Client.work(options, report)

function report (cb, results) {
  console.log(util.inspect(results))
  process.exit()
}
