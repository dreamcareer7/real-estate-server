/**
 * @namespace GoogleCredential
 */

const GoogleCredential = {
  ...require('./create'),
  ...require('./get'),
  ...require('./update'),
  ...require('./action')
}

module.exports = GoogleCredential