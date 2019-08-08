const MicrosoftPlugin     = require('./graph.js')
const MicrosoftCredential = require('../credential')

const Context = require('../../Context')
const Slack   = require('../../Slack')


const handleException = async function(credential, ex) {
  const msg = 'Microsoft-client-Failed'
  Context.log(msg, JSON.stringify(ex), JSON.stringify(credential))

  let invalidGrant = false

  if ( ex.message === 'invalid_grant' )
    invalidGrant = true

  if (ex.response) {
    if (ex.response.body) {
      const body = JSON.parse(ex.response.body)

      if ( body.error === 'invalid_grant' )
        invalidGrant = true
    }
  }

  if (invalidGrant)
    await MicrosoftCredential.updateAsRevoked(credential.id)

  const obj = {
    id: credential.id,
    user: credential.user,
    brand: credential.brand,
    remote_id: credential.remote_id,
    email: credential.email,
    scope: credential.scope,
    revoked: credential.revoked,
    last_sync_at: credential.last_sync_at
  }

  Slack.send({ channel: '7-server-errors', text: `${msg} - Info: ${JSON.stringify(obj)}`, emoji: ':skull:' })
  Slack.send({ channel: 'integration_logs', text: `${msg} - Info: ${JSON.stringify(obj)} - Exception: ${JSON.stringify(ex)}`, emoji: ':skull:' })
}

const getMGraphClient = async (credential) => {
  const microsoft = await MicrosoftPlugin.setupClient(credential)

  try {
    const newTokens = await microsoft.refreshToken()
    await MicrosoftCredential.updateTokens(credential.id, newTokens)

    return microsoft

  } catch (ex) {

    await handleException(credential, ex)

    return null
  }
}


module.exports = {
  getMGraphClient
}