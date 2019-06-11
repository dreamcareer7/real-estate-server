const GoogleCredential = require('../credential')
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


const syncProfile = async (data) => {
  try {
    const google  = await setupClient(data.googleCredential)
    const profile = await google.getGmailProfile()

    await GoogleCredential.updateGmailProfile(data.googleCredential.id, profile)  

    return {
      gmailProfile: profile,
      status: true
    }

  } catch (ex) {

    return {
      profile: null,
      status: false,
      ex: ex
    }
  }
}


module.exports = {
  syncProfile
}