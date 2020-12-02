const User         = require('../../../User/get')
const AttachedFile = require('../../../AttachedFile')


const extractPhoto = async (google, userId, brand, contact) => {
  const imageData = await google.getContactPhoto(contact.photo)

  if (!imageData) {
    return null
  }

  const user = await User.get(userId)

  const file = await AttachedFile.saveFromBuffer({
    buffer: Buffer.from(imageData, 'binary'),
    filename: `google_cover_${contact.entry_id}.jpg`,
    relations: [],
    path: `${brand}/avatars`,
    user: user,
    public: true
  })

  return file
}


module.exports = {
  extractPhoto
}
