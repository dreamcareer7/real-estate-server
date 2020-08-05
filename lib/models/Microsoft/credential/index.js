/**
 * @namespace MicrosoftCredential
 */

const MicrosoftCredential = {
  ...require('./create'),
  ...require('./get'),
  ...require('./update'),
  ...require('./action')
}

module.exports = MicrosoftCredential