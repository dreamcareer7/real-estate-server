const config = require('../../config')

module.exports.isAllowed = (filename, extensions = null) => {
  const ext = filename.split('.').pop().toLowerCase()

  if (!extensions)
    extensions = config.allowed_upload_types

  return extensions.indexOf(ext) > -1
}
