const AttachedFile = require('../../AttachedFile/index')
const getKey = require('./key')

/**
 * @param {string} name
 * @returns {Promise<string | null>}
 */
async function download(name) {
  const path = getKey(name)
  try {
    return await AttachedFile.downloadAsString({ public: false, path })
  } catch {
    return null
  }
}

module.exports = download
