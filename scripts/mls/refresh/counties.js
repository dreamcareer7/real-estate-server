#!/usr/bin/env node

require('../../connection.js')
require('../../../lib/utils/db.js')
const MLSJob = require('../../../lib/models/MLSJob')
const Listing = require('../../../lib/models/Listing')

Listing.refreshCounties(err => {
  if (err)
    console.log(err)

  const job = {
    name: 'refresh_counties'
  }

  MLSJob.insert(job, process.exit)
})
