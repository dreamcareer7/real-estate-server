const config  = require('../../../config')
const Slack   = require('../../Slack')
const Context = require('../../Context')

const MockPlugin   = require('../plugin/googleapis_mock.js')
const GooglePlugin = require('../plugin/googleapis.js')

const { disconnect, updateAccesshToken } = require('../credential/update')

const channel = config.google_integration.slack_channel



const handleException = async function(credential, ex) {
  const obj = {
    id: credential.id,
    email: credential.email
  }

  const text  = `Google-client-Failed - Message: ${ex.message} - Info: ${JSON.stringify(obj)}`
  const emoji = ':skull:'

  if ( ex.statusCode === 401 || ex.statusCode === 400 ) {
    await disconnect(credential.id)
  }

  Context.log(credential.id, ex.message)

  Slack.send({ channel, text, emoji })
}

const getMockClient = async () => {
  return MockPlugin.setupClient()
}

const getGoogleClient = async (credential) => {
  try {

    const google = await GooglePlugin.setupClient(credential)

    const uts  = new Date().getTime()
    const diff = Number(credential.expiry_date) - uts
    const gap  = 300000 // 5 minutes

    if ( diff <= gap ) {
      const tokens = await google.refreshToken(credential.refresh_token)
      const expires_in = new Date().getTime() + (tokens.expires_in * 1000)
      await updateAccesshToken(credential.id, tokens.access_token, expires_in)
      await google.setCredentials({ access_token: tokens.access_token })
    }

    return google

  } catch (ex) {

    await handleException(credential, ex)
    return null
  }
}


module.exports = {
  getMockClient,
  getGoogleClient
}