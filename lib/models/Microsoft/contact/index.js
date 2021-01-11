/**
 * @namespace MicrosoftContact
 */

const MicrosoftContact = {
  ...require('./get'),
  ...require('./create'),
  ...require('./update'),
  ...require('./delete')
}


module.exports = MicrosoftContact