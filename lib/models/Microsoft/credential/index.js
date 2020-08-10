/**
 * @namespace MicrosoftCredential
 */

const MicrosoftCredential = {
  ...require('./create'),
  ...require('./get'),
  ...require('./getAll'),
  ...require('./update'),
  ...require('./action')
}

module.exports = MicrosoftCredential