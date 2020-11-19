const Context = require('../../Context')

const MockPlugin   = require('../plugin/googleapis_mock.js')
const GooglePlugin = require('../plugin/googleapis.js')

const { disconnect, updateAccesshToken } = require('../credential/update')


const Slack = require('../../Slack')


const handleException = async function(credential, ex) {
  const msg = 'Google-client-Failed'

  if ( ex.statusCode === 401 || ex.statusCode === 400 ) {
    await disconnect(credential.id)
  }

  const obj = {
    id: credential.id,
    email: credential.email
  }

  Context.log(msg, credential.id, ex)

  //  400 - "{\n  \"error\": \"invalid_grant\",\n  \"error_description\": \"Bad Request\"\n}
  Slack.send({ channel: '7-server-errors',  text: `${msg} - Message: ${ex.message} - Info: ${JSON.stringify(obj)}`, emoji: ':skull:' })
  Slack.send({ channel: 'integration_logs', text: `${msg} - Message: ${ex.message} - Info: ${JSON.stringify(obj)}`, emoji: ':skull:' })
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