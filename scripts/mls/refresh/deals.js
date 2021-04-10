#!/usr/bin/env node

require('../../connection.js')
const db = require('../../../lib/utils/db.js')
const MLSJob = require('../../../lib/models/MLSJob')

const async = require('async')

async.series([
  cb => db.executeSql('REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.deals', [], null, cb)
], err => {
  if (err)
    console.error(err)

  const job = {
    name: 'refresh_deals'
  }

  MLSJob.insert(job, process.exit)
})
