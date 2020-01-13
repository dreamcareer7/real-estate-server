const User         = require('../../../User')
const AttachedFile = require('../../../AttachedFile')


const extractAvatar = async (microsoft, userId, brandId) => {
  try {
    const { imageData } = await microsoft.getProfileAvatar()

    if (!imageData)
      return null

    const user = await User.get(userId)

    const file = await AttachedFile.saveFromBuffer({
      buffer: Buffer.from(imageData, 'binary'),
      filename: `microsoft_profile_cover_${userId}.jpg`,
      relations: [],
      path: `${brandId}/avatars`,
      user: user,
      public: true,
    })

    return file

  } catch (ex) {
    return null
  }
}


module.exports = extractAvatar