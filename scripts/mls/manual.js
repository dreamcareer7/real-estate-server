#!/usr/bin/env node

require('../connection.js')
require('../../lib/models/index.js')

const db = require('../../lib/utils/db.js')
const spawn = require('child_process').spawn
const async = require('async')

async.auto({
  list: cb => {
    db.executeSql('SELECT matrix_unique_id FROM listings WHERE status = $1 LIMIT 350', [ 'Out Of Sync' ], (err, res) => {
      if(err)
        return cb(err)

      const ids = res.rows.map(r => r.matrix_unique_id)

      return cb(null, ids)
    })
  },
  update: [
    'list',
    (cb, results) => {
      if(results.list.length < 1)
        return cb()

      const l = results.list.join(',')
      console.log('(FIX OUT_OF_SYNC) Fixing the following listings =>', l)

      const p = spawn(`${__dirname}/listings.js`, ['--query', `(Matrix_Unique_ID=${l})`])

      p.stdout.pipe(process.stdout)
      p.stderr.pipe(process.stderr)

      p.on('close', cb)
    }
  ]
}, (err, results) => {
  if(err)
    console.log(err)

  const job = {
    name: 'fix_outofsync'
  }

  MLSJob.insert(job, process.exit)
})
