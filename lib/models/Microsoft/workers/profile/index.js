const MicrosoftCredential = require('../../credential')


const syncProfile = async (microsoft, data) => {
  try {
    const profile = await microsoft.getProfile()

    await MicrosoftCredential.updateProfile(data.microsoftCredential.id, profile)  

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