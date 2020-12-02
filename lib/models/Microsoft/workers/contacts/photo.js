const User         = require('../../../User/get')
const AttachedFile = require('../../../AttachedFile')


const extractPhoto = async (microsoft, userId, brand, contact) => {
  try {
    const { imageData } = await microsoft.getContactPhoto(contact.id)

    if (!imageData) {
      return null
    }

    const user = await User.get(userId)

    const file = await AttachedFile.saveFromBuffer({
      buffer: Buffer.from(imageData, 'binary'),
      filename: `microsoft_cover_${contact.id}.jpg`,
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


module.exports = {
  extractPhoto
}