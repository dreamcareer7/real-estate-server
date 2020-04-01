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

    const google = await GooglePlugin.setupClient(credential)

    const uts  = new Date().getTime()
    const diff = Number(credential.expiry_date) - uts

    console.log('------ uts', uts)
    console.log('------ exp', credential.expiry_date)
    console.log('------ diff', diff, diff < 0) // 300000

    if ( diff <= 0 ) {
      const tokens = await google.refreshToken(credential.refresh_token)
      console.log('------ tokens', tokens)
      const expires_in = new Date().getTime() + (tokens.expires_in * 1000)
      await GoogleCredential.updateAccesshToken(credential.id, tokens.access_token, expires_in)
      await google.setCredentials({ access_token: tokens.access_token })
    }

    return google

  } catch (ex) {

    await handleException(credential, ex)
    return null
  }
}

const getGoogleClient_old = async (credential) => {
  try {
    const google = await GooglePlugin.setupClient(credential)
  
    if (google.oAuth2Client) {
      google.oAuth2Client.on('tokens', async tokens => {
        if (tokens.access_token && tokens.expiry_date) {
          await GoogleCredential.updateAccesshToken(credential.id, tokens.access_token, tokens.expiry_date)
          await google.setCredentials({ access_token: tokens.access_token })
        }
      })
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