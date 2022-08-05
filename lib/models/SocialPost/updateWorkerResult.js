const db = require('../../utils/db')

/**
 * update social post into database after publishing the image
 * @param {Object} obj
 * @param {UUID} [obj.fileId] - file id
 * @param {string} [obj.postLink] - permalink of the instagram image
 * @param {string} [obj.publishedMediaId] - published media container id from instagram api
 * @param {string} [obj.mediaContainerId] - media container id from instagram api
 * @param {UUID} obj.id - social post id
 * @returns {Promise<>}
 */

const updateWorkerResult = async ({ id, fileId, postLink, publishedMediaId, mediaContainerId }) => {
  return db.update('social_post/update-worker-result', [id, fileId, postLink, publishedMediaId, mediaContainerId])
}

module.exports = updateWorkerResult
