#!/usr/bin/env node

require('../../connection.js')
const db = require('../../../lib/utils/db.js')
const MLSJob = require('../../../lib/models/MLSJob')

const async = require('async')

async.series([
  cb => db.executeSql('REFRESH MATERIALIZED VIEW CONCURRENTLY deals_brands', [], null, cb),
  cb => db.executeSql('REFRESH MATERIALIZED VIEW CONCURRENTLY calendar.deals_buyers', [], null, cb),
  cb => db.executeSql('REFRESH MATERIALIZED VIEW CONCURRENTLY calendar.deals_closed_buyers', [], null, cb),
], err => {
  if (err)
    console.error(err)

  const job = {
    name: 'refresh_deals_buyers'
  }

  MLSJob.insert(job, process.exit)
})
