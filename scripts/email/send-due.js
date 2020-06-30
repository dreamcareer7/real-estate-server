#!/usr/bin/env node

require('../connection.js')
require('../../lib/models/index.js')
const EmailCampaign = require('../../lib/models/Email/campaign')
const Job = require('../../lib/models/Job')

const send = async () => {
  const campaign = await EmailCampaign.get(process.argv[2])
  await EmailCampaign.send(campaign)
  Context.log('Starting to handle jobs')
  await Job.handleContextJobs()
  Context.log('Script Done')
  process.exit()
}

send()
  .catch(e => {
    console.log(e)
    process.exit()
  })
