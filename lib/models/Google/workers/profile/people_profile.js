const GoogleCredential = require('../../credential')


const syncProfile = async (google, data) => {
  try {
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
      profile,
      status: true,
      ex: null
    }

  } catch (ex) {

    return {
      profile: null,
      status: false,
      ex
    }
  }
}


module.exports = {
  syncProfile
}