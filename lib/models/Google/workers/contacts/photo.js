
const User         = require('../../../User')
const AttachedFile = require('../../../AttachedFile')


const extractPhoto = async (google, userId, brand, conn) => {
  try {
    const imageData = await google.getContactPhoto(conn.photo)

    if (!imageData)
      return null

    const user = await User.get(userId)

    const file = await AttachedFile.saveFromBuffer({
      buffer: Buffer.from(imageData, 'binary'),
      filename: `google_cover_${conn.entry_id}.jpg`,
      relations: [],
      path: `${brand}/avatars`,
      user: user,
      public: true
    })

    return file

  } catch (ex) {
    return null
  }
}


module.exports = {
  extractPhoto
}