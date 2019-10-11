#!/usr/bin/env node

require('../../connection.js')
const db = require('../../../lib/utils/db.js')
require('../../../lib/models/index.js')

db.executeSql('REFRESH MATERIALIZED VIEW CONCURRENTLY deals_brands', [], err => {
  if (err)
    console.error(err)

  const job = {
    name: 'refresh_deals_brands'
  }

  MLSJob.insert(job, process.exit)
})
