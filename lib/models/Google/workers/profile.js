const GoogleCredential = require('../credential')
const GooglePlugin     = require('../plugin/googleapis.js')


let google

const setupClient = async function(credential) {
  if (google)
    return google

  google = await GooglePlugin.setupClient(credential)

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
    const google     = await setupClient(data.googleCredential)
    const profileObj = await google.getProfile()

    const profile = {}

    for ( const name of profileObj.names ) {
      if ( name.metadata.primary ) {
        profile.displayName = name.displayName
        profile.firstName   = name.givenName
        profile.lastName    = name.familyName
      }
    }

    for ( const photo of profileObj.photos ) {
      if ( photo.metadata.primary )
        profile.photo = photo.url
    }

    await GoogleCredential.updateProfile(data.googleCredential.id, profile)  

    return {
      profile: profile,
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