const MicrosoftCredential = require('../../credential')
const User                = require('../../../User')
const AttachedFile        = require('../../../AttachedFile')



const extractAvatar = async (microsoft, userId, brand) => {
  try {
    const { imageData } = await microsoft.getProfileAvatar()

    if (!imageData)
      return null

    const user = await User.get(userId)

    const file = await AttachedFile.saveFromBuffer({
      buffer: Buffer.from(imageData, 'binary'),
      filename: `microsoft_profile_cover_${userId}.jpg`,
      relations: [],
      path: `${brand}/avatars`,
      user: user,
      public: true,
    })

    return file

  } catch (ex) {
    return null
  }
}

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
      profile: profile,
      status: true,
      ex: null
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