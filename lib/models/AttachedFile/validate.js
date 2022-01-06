const config = require('../../config')
const Context = require('../Context')

module.exports.isAllowed = filename => {
  const ext = filename.split('.').pop().toLowerCase()

  const is = config.allowed_upload_types.indexOf(ext) > -1

  Context.log('Upload allow check', filename, ext, is)

  return is
}
