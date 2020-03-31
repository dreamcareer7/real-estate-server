const MockPlugin       = require('../plugin/googleapis_mock.js')
const GooglePlugin     = require('../plugin/googleapis.js')
const GoogleCredential = require('../credential')

const Slack = require('../../Slack')


const handleException = async function(credential, ex) {
  const msg = 'Google-client-Failed'

  if ( ex.statusCode === 401 ) {
    await GoogleCredential.disableEnableSync(credential.id, 'disable')
  }

  const obj = {
    id: credential.id,
    email: credential.email
  }

  Slack.send({ channel: '7-server-errors',  text: `${msg} - Details: ${ex.message} - Info: ${JSON.stringify(obj)}`, emoji: ':skull:' })
  Slack.send({ channel: 'integration_logs', text: `${msg} - Details: ${ex.message} - Info: ${JSON.stringify(obj)}`, emoji: ':skull:' })
}

const getMockClient = async () => {
  return MockPlugin.setupClient()
}

const getGoogleClient = async (credential) => {
  try {

    // get token info
    // if it is expired
      // refresh token
    // else do nothing

    const google = await GooglePlugin.setupClient(credential)
  
    google.oAuth2Client.on('tokens', async tokens => {
      if (tokens.refresh_token) {
        await GoogleCredential.updateRefreshToken(credential.id, tokens.refresh_token)
        await google.setCredentials({ refresh_token: tokens.refresh_token })
      }

      if (tokens) {
        await GoogleCredential.updateAccesshToken(credential.id, tokens.access_token, tokens.expiry_date)
        await google.setCredentials({ access_token: tokens.access_token })
      }
    })

    return google
  
  } catch (ex) {

    await handleException(credential, ex)

    return null
  }
}

const getGoogleClient_old = async (credential) => {
  try {

    const google = await GooglePlugin.setupClient(credential)
  
    google.oAuth2Client.on('tokens', async tokens => {
      if (tokens.refresh_token) {
        await GoogleCredential.updateRefreshToken(credential.id, tokens.refresh_token)
        await google.setCredentials({ refresh_token: tokens.refresh_token })
      }

      if (tokens) {
        await GoogleCredential.updateAccesshToken(credential.id, tokens.access_token, tokens.expiry_date)
        await google.setCredentials({ access_token: tokens.access_token })
      }
    })

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