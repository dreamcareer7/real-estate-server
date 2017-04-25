#!/usr/bin/env node

require('../../connection.js')
require('../../../lib/utils/db.js')
require('../../../lib/models/index.js')

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

  process.exit()
})
