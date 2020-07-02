#!/usr/bin/env node

const User  = require('../../lib/models/User')
const Email = require('../../lib/models/Email')

require('../connection.js')
require('../../lib/models/index.js')
const fs = require('fs')
const Daily = require('../../lib/models/Daily')
const Job = require('../../lib/models/Job')

const send = async () => {
  const user = await User.getByEmail(process.argv[2])
  if (!user)
    throw Error.ResourceNotFound()

  const { rows } = await Daily.sendForUser(user.id)
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
