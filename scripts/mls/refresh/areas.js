#!/usr/bin/env node

require('../../connection.js')
require('../../../lib/utils/db.js')
require('../../../lib/models/index.js')

Listing.refreshAreas(err => {
  if (err)
    console.log(err)

  const job = {
    name: 'refresh_mls_areas'
  }

  MLSJob.insert(job, process.exit)
})
