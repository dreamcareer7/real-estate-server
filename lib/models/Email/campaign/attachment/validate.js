const AttachedFile = require('../../../AttachedFile')

const validateAttachmentsSize = async (ids, limit) => {
  const limitMsg = `${Math.round(limit / (1024 * 1024))}MB`

  const files = await AttachedFile.getAll(ids)
  
  if (files.length === 0) {
    return
  }

  const promises = []

  for (const file of files) {
    promises.push(AttachedFile.getFileSize(file))
  }

  let sizeSum = 0

  const result = await Promise.all(promises)

  for (const base64Size of result) {
    if ( base64Size > limit ) {
      throw Error.BadRequest(`File size could not be greater than ${limitMsg}!`)
    }

    sizeSum += base64Size
  }

  if ( sizeSum > limit ) {
    throw Error.BadRequest(`Files size could not be greater than ${limitMsg}!`)
  }
}

module.exports = {
  validateAttachmentsSize,
}
