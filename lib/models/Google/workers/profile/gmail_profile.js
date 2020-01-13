const GoogleCredential = require('../../credential')


const syncProfile = async (google, data) => {
  try {
    const profile = await google.getGmailProfile()

    await GoogleCredential.updateGmailProfile(data.googleCredential.id, profile)  

    return {
      gmailProfile: profile,
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