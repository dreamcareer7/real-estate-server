/**
 * @namespace MicrosoftContact
 */

const MicrosoftContact = {
  ...require('./get'),
  ...require('./create'),
  ...require('./update'),
  ...require('./delete'),
  ...require('./support')
}


module.exports = MicrosoftContact