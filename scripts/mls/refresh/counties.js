#!/usr/bin/env node

require('../../connection.js')
require('../../../lib/utils/db.js')
require('../../../lib/models/index.js')

Listing.refreshCounties(err => {
  if (err)
    console.log(err)

  const job = {
    name: 'refresh_counties'
  }

  MLSJob.insert(job, process.exit)
})
