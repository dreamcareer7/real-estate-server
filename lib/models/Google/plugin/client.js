const GooglePlugin     = require('../plugin/googleapis.js')
const GoogleCredential = require('../credential')

const Context = require('../../Context')
const Slack   = require('../../Slack')


const handleException = async function(credential, ex) {
  const msg = 'Google-client-Failed'
  Context.log(msg, JSON.stringify(ex), JSON.stringify(credential))

  if ( ex.statusCode === 401 )
    await GoogleCredential.updateAsRevoked(credential.id)

  const obj = {
    id: credential.id,
    user: credential.user,
    brand: credential.brand,
    resource_name: credential.resource_name,
    email: credential.email,
    scope: credential.scope,
    revoked: credential.revoked,
    last_sync_at: credential.last_sync_at
  }

  if ( ex.statusCode !== 503 )
    Slack.send({ channel: '7-server-errors', text: `${msg} - Info: ${JSON.stringify(obj)}`, emoji: ':skull:' })

  Slack.send({ channel: 'integration_logs', text: `${msg} - Info: ${JSON.stringify(obj)} - Exception: ${JSON.stringify(ex)}`, emoji: ':skull:' })
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