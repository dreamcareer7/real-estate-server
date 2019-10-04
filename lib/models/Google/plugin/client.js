const GooglePlugin     = require('../plugin/googleapis.js')
const GoogleCredential = require('../credential')

const Slack = require('../../Slack')


const handleException = async function(credential, ex) {
  const msg = 'Google-client-Failed'

  if ( ex.statusCode === 401 )
    await GoogleCredential.disableEnableSync(credential.id, 'disable')

  await GoogleCredential.postponeSync(credential.id)

  const obj = {
    id: credential.id,
    email: credential.email,
    revoked: credential.revoked,
    last_sync_at: credential.last_sync_at
  }

  // if ( ex.statusCode !== 503 )
  Slack.send({ channel: '7-server-errors',  text: `${msg} - Details: ${ex.message} - Info: ${JSON.stringify(obj)}`, emoji: ':skull:' })
  Slack.send({ channel: 'integration_logs', text: `${msg} - Details: ${ex.message} - Info: ${JSON.stringify(obj)} - Action: Job postponed`, emoji: ':skull:' })
}

const getGoogleClient = async (credential) => {
  try {

    const google = await GooglePlugin.setupClient(credential)
  
    google.oAuth2Client.on('tokens', async tokens => {
      if (tokens.refresh_token) {
        await GoogleCredential.updateRefreshToken(credential.id, tokens.refresh_token)
        await google.setCredentials({ refresh_token: tokens.refresh_token })
      }
  
      await GoogleCredential.updateAccesshToken(credential.id, tokens.access_token)
      await google.setCredentials({ access_token: tokens.access_token })
    })

    return google
  
  } catch (ex) {

    await handleException(credential, ex)

    return null
  }
}


module.exports = {
  getGoogleClient
}


/*

Handled Exceptions:

Exception: {"code":503,"message":{"name":"StatusCodeError","statusCode":503,"message":"503 - "{  "error": {    "code": 503,    "message": "The service is currently unavailable.",    "status": "UNAVAILABLE"  }}"","error":"{"error": {  "code": 503,  "message": "The service is currently unavailable.",  "status": "UNAVAILABLE"}}

*/