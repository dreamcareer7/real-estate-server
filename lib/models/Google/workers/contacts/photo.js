const User         = require('../../../User/get')
const AttachedFile = require('../../../AttachedFile')


const extractPhoto = async (google, userId, brand, contact) => {
  if (!contact.org_photo) {
    return null
  }

  const imageData = await google.getContactPhoto(contact.org_photo)

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
