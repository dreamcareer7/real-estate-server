const config = require('../../config')

module.exports.isAllowed = filename => {
  const ext = filename.split('.').pop().toLowerCase()

  return config.allowed_upload_types.indexOf(ext) > -1
}
