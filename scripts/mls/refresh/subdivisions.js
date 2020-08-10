#!/usr/bin/env node

require('../../connection.js')
require('../../../lib/utils/db.js')
const MLSJob = require('../../../lib/models/MLSJob')
const Listing = require('../../../lib/models/Listing')

Listing.refreshSubdivisions(err => {
  if (err)
    console.log(err)

  const job = {
    name: 'refresh_subdivisions'
  }

  MLSJob.insert(job, process.exit)
})
