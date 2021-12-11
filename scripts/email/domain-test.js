#!/usr/bin/env node

require('../connection.js')
require('../../lib/models/index.js')

const Email = require('../../lib/models/Email/create')

const { peanar } = require('../../lib/utils/peanar')

const { getDomainForUser } = require('../../lib/models/Email/campaign/domain')

const send = async () => {
  const from = process.argv[2]
  if (!from) {
    console.log('Please provide an "from" email address')
    return
  }

  const to = process.argv[3]
  if (!to) {
    console.log('Please provide an "to" email address')
    return
  }

  const user = {
    email: from,
    email_confirmed: true
  }

  const domain = await getDomainForUser(user)

  const email = {
    subject: 'Test Email',
    from,
    to: [to],
    html: 'Test Email',
    domain
  }

  const saved = await Email.create(email)
  console.log(saved)

  await peanar.enqueueContextJobs()
}

send()
  .catch(e => {
    console.log(e)
    process.exit()
  })
  .then(process.exit)
