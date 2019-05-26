const GoogleCredential = require('../credential')
const GoogleMessage    = require('../message')
const GooglePlugin     = require('../plugin')


let google

const setupClient = async function(credential) {
  if(google)
    return google

  google = await GooglePlugin.setupClient(credential)

  // @ts-ignore
  google.oAuth2Client.on('tokens', async (tokens) => {
    if (tokens.refresh_token) {
      await GoogleCredential.updateRefreshToken(credential.id, tokens.refresh_token)
      await google.setCredentials({ refresh_token: tokens.refresh_token })
    }

    await google.setCredentials({ access_token: tokens.access_token })
  })

  return google
}



const syncMessages = async data => {
  return true
}

module.exports = {
  syncMessages
}