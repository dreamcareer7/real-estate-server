#!/usr/bin/env node

require('../../connection.js')
require('../../../lib/utils/db.js')
require('../../../lib/models/index.js')

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
