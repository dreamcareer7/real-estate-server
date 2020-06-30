#!/usr/bin/env node

require('../../connection.js')
require('../../../lib/utils/db.js')
const MLSJob = require('../../../lib/models/MLSJob')
const Agent = require('../../../lib/models/Agent')

Agent.refreshContacts()
  .catch(err => {
    console.log(err)
    process.exit()
  })
  .then(() => {
    const job = {
      name: 'refresh_agents'
    }

    MLSJob.insert(job, process.exit)
  })
