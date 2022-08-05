const db = require('../../utils/db')

/**
 * update social post into database after publishing the image
 * @param {Object} obj
 * @param {UUID} obj.jpegFileId - file id
 * @param {string} obj.postLink - permalink of the instagram image
 * @param {string} obj.publishedMediaId - published media container id from instagram api
 * @param {UUID} obj.id - social post id
 * @returns {Promise<>}
 */

const updateWorkerResult = async ({ id, jpegFileId, postLink, publishedMediaId }) => {
  return db.update('social_post/update-worker-result', [id, jpegFileId, postLink, publishedMediaId])
}

module.exports = updateWorkerResult
