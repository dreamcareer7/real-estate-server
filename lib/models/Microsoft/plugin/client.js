const config = require('../../../config')
const Slack  = require('../../Slack')

const MockPlugin      = require('./graph_mock')
const MicrosoftPlugin = require('./graph.js')

const { disconnect, updateTokens } = require('../credential/update')

const channel = config.microsoft_integration.slack_channel



const handleException = async function(credential, ex) {
  const obj = {
    id: credential.id,
    email: credential.email
  }

  const text  = `Microsoft-client-Failed - Message: ${ex.message} - Info: ${JSON.stringify(obj)}`
  const emoji = ':skull:'

  let invalidGrant = false

  if ( ex.statusCode === 401 || ex.message === 'invalid_grant' ) {
    invalidGrant = true
  }

  if (ex.response) {
    if (ex.response.body) {
      const body = JSON.parse(ex.response.body)

      if ( body.error === 'invalid_grant' ) {
        invalidGrant = true
      }
    }
  }

  if (invalidGrant) {
    await disconnect(credential.id)
  }

  Slack.send({ channel, text, emoji })

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

    const microsoft = await MicrosoftPlugin.setupClient(credential)

    if ( diff < 300000 ) {
      const newTokens = await microsoft.refreshToken()
      await updateTokens(credential.id, newTokens)

      return {
        microsoft,
        invalidGrant
      }
    }

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