#!/usr/bin/env node

require('../connection.js')
require('../../lib/models/index.js')

const Context = require('../../lib/models/Context')
const EmailCampaign = require('../../lib/models/Email/campaign')

const { peanar } = require('../../lib/utils/peanar')

const send = async () => {
  await EmailCampaign.send(process.argv[2])
  Context.log('Starting to handle jobs')
  await peanar.enqueueContextJobs()
  Context.log('Script Done')
  process.exit()
}

send()
  .catch(e => {
    console.log(e)
    process.exit()
  })
