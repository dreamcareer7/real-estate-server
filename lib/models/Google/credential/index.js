/**
 * @namespace GoogleCredential
 */

const GoogleCredential = {
  ...require('./create'),
  ...require('./get'),
  ...require('./getAll'),
  ...require('./update'),
  ...require('./action')
}

module.exports = GoogleCredential