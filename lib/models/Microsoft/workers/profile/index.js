const MicrosoftCredential = require('../../credential')
const extractAvatar = require('./helper')



const syncProfile = async (microsoft, data) => {
  try {
    const brand = data.microsoftCredential.brand
    const user  = data.microsoftCredential.user

    const profile = await microsoft.getProfile()

    const file = await extractAvatar(microsoft, user, brand)
    if (file) {
      profile.photo = file.url
    }

    await MicrosoftCredential.updateProfile(data.microsoftCredential.id, profile)  

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