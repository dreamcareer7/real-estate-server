#!/usr/bin/env node

require('../../connection.js')
require('../../../lib/utils/db.js')
const MLSJob = require('../../../lib/models/MLSJob')
const Listing = require('../../../lib/models/Listing')

Listing.refreshAreas(err => {
  if (err)
    console.log(err)

  const job = {
    name: 'refresh_mls_areas'
  }

  MLSJob.insert(job, process.exit)
})
