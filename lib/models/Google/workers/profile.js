const GoogleCredential = require('../credential')
const GooglePlugin     = require('../plugin/googleapis.js')


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


const syncProfile = async (data) => {
  // data: {
  //   meta: {
  //     firstSync: Boolean,
  //     action: 'sync_profile'
  //   },
  //   googleCredential: googleCredential
  // }

  const google  = await setupClient(data.googleCredential)
  const profile = await google.getGmailProfile()

  await GoogleCredential.updateProfile(data.googleCredential.id, profile)
  await GoogleCredential.updateLastProfileSyncTime(data.googleCredential.id)

  return profile
}


module.exports = {
  syncProfile
}