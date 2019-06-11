const GoogleCredential = require('../credential')
// const GoogleThread  = require('../thread')
const GooglePlugin     = require('../plugin/googleapis.js')


const setupClient = async function(credential) {
  const google = await GooglePlugin.setupClient(credential)

  // @ts-ignore
  google.oAuth2Client.on('tokens', async (tokens) => {
    if (tokens.refresh_token) {
      await GoogleCredential.updateRefreshToken(credential.id, tokens.refresh_token)
      await google.setCredentials({ refresh_token: tokens.refresh_token })
    }

    await GoogleCredential.updateAccesshToken(credential.id, tokens.access_token)
    await google.setCredentials({ access_token: tokens.access_token })
  })

  return google
}


const syncThreads = async data => {
  const google  = await setupClient(data.googleCredential)

  await google.fullSyncThreads()

  // await google.listThreads()
  // await google.listMessages()
  // await google.getMessage('16b02d534f4bf27e')
  // await google.getThread('16b02d534f4bf27e')  

  return true
}

module.exports = {
  syncThreads
}