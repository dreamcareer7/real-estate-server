#!/usr/bin/env node

require('../../connection.js')
require('../../../lib/utils/db.js')
const MLSJob = require('../../../lib/models/MLSJob')
const Address = require('../../../lib/models/Address')

const async = require('async')

async.auto({
  fix: cb => {
    Address.fixMissing(cb)
  },
  reschedule: [
    'fix',
    (cb, results) => {
      console.log('(FIX GEO_CODES) Fixing the following listings =>', results.fix)

      async.map(results.fix, Address.reschedule, cb)
    }
  ]
}, (err, results) => {
  if(err)
    console.log(err)

  const job = {
    name: 'fix_geocode'
  }

  MLSJob.insert(job, process.exit)
})
