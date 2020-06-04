#!/usr/bin/env node

require('../connection.js')
require('../../lib/models/index.js')
const Daily = require('../../lib/models/Daily')
const Job = require('../../lib/models/Job')

const send = async () => {
  console.log(Daily.sendForUser)
  await Daily.sendForUser(process.argv[2])
  await Job.handleContextJobs()
  console.log('Sent')
  process.exit()
}

send()
  .catch(e => {
    console.log(e)
    process.exit()
  })
