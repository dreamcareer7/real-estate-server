#!/usr/bin/env node

require('../../connection.js')
require('../../../lib/utils/db.js')

const School = require('../../../lib/models/School')
const MLSJob = require('../../../lib/models/MLSJob')

School.refresh(err => {
  if (err)
    console.log(err)

  const job = {
    name: 'refresh_schools'
  }

  MLSJob.insert(job, process.exit)
})
