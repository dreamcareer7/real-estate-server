#!/usr/bin/env node

require('../connection.js')
require('../../lib/models/index.js')
const fs = require('fs')
const Daily = require('../../lib/models/Daily')
const Job = require('../../lib/models/Job')

const send = async () => {
  const { rows } = await Daily.sendForUser(process.argv[2])
  await Job.handleContextJobs()
  const email = await Email.get(rows[0].email)
  fs.writeFileSync('/tmp/1.html', email.html)
  setTimeout(process.exit, 3000)
}

send()
  .catch(e => {
    console.log(e)
    process.exit()
  })
