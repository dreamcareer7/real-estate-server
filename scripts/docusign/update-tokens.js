#!/usr/bin/env node

require('../connection.js')
require('../../lib/models/index.js')

const promisify = require('../../lib/utils/promisify')

const refresh = async docusign_user => {
  try {
    await Envelope.refreshToken(docusign_user)
  } catch(e) {
    Context.log('Failed to refresh tokens for', docusign_user.user, e)
  }

  Context.log('Token updated for', docusign_user.user)
}

const update = async () => {
  const expiring = await Envelope.getExpiringUsers()

  Context.log('Starting to validate', expiring.length, 'docusign tokens')

  const promises = expiring.map(refresh)
  await Promise.all(promises)

  await promisify(MLSJob.insert)({
    name: 'update_tokens'
  })

  process.exit()
}

update()
  .catch(e => {
    console.log(e)
    process.exit()
  })
