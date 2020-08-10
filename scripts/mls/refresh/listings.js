#!/usr/bin/env node

require('../../connection.js')
require('../../../lib/utils/db.js')
const MLSJob = require('../../../lib/models/MLSJob')
const Alert = require('../../../lib/models/Alert')

Alert.refreshFilters(err => {
  if (err)
    console.log(err)

  const job = {
    name: 'refresh_listings'
  }

  MLSJob.insert(job, process.exit)
})
