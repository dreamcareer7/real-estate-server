const MockPlugin          = require('./graph_mock')
const MicrosoftPlugin     = require('./graph.js')
const MicrosoftCredential = require('../credential')

const Slack = require('../../Slack')


const handleException = async function(credential, ex) {
  const msg = 'Microsoft-client-Failed'

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

  if (invalidGrant) {
    await MicrosoftCredential.disableEnableSync(credential.id, 'disable')
  }

  await MicrosoftCredential.postponeSync(credential.id)

  const obj = {
    id: credential.id,
    email: credential.email,
    revoked: credential.revoked,
    last_sync_at: credential.last_sync_at
  }

  Slack.send({ channel: '7-server-errors',  text: `${msg} - Details: ${ex.message} - Info: ${JSON.stringify(obj)}`, emoji: ':skull:' })
  Slack.send({ channel: 'integration_logs', text: `${msg} - Details: ${ex.message} - Info: ${JSON.stringify(obj)} - Action: Job postponed`, emoji: ':skull:' })

  return invalidGrant
}

const getMockClient = async () => {
  return MockPlugin.setupClient()
}

const getMGraphClient = async (credential) => {
  let invalidGrant = false

  try {

    const uts  = new Date().getTime()
    const diff = Number(credential.expires_in) - uts

    // 5 minutes
    if ( diff < 300000 ) {

      const microsoft = await MicrosoftPlugin.setupClient(credential)
      const newTokens = await microsoft.refreshToken()
      await MicrosoftCredential.updateTokens(credential.id, newTokens)

      return {
        microsoft,
        invalidGrant
      }
    }

    const microsoft = await MicrosoftPlugin.setupClient(credential)

    return {
      microsoft,
      invalidGrant
    }

  } catch (ex) {

    invalidGrant = await handleException(credential, ex)

    return {
      microsoft: null,
      invalidGrant
    }
  }
}


module.exports = {
  handleException,
  getMockClient,
  getMGraphClient
}