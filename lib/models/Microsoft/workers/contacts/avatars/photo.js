const User         = require('../../../../User/get')
const AttachedFile = require('../../../../AttachedFile')


const extractPhoto = async (microsoft, userId, brandId, contact) => {
  const { imageData } = await microsoft.getContactPhoto(contact.remote_id)

  if (!imageData) {
    return null
  }

  const user = await User.get(userId)

  const file = await AttachedFile.saveFromBuffer({
    buffer: Buffer.from(imageData, 'binary'),
    filename: `microsoft_cover_${contact.remote_id}.jpg`,
    relations: [],
    path: `${brandId}/avatars`,
    user,
    public: true,
  })

  return file
}


module.exports = {
  extractPhoto
}