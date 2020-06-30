#!/usr/bin/env node

require('../../connection.js')
require('../../../lib/utils/db.js')
require('../../../lib/models/index.js')

School.refresh(err => {
  if (err)
    console.log(err)

  const job = {
    name: 'refresh_schools'
  }

  MLSJob.insert(job, process.exit)
})
