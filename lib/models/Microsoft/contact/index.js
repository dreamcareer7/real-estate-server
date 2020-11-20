/**
 * @namespace MicrosoftContact
 */

const MicrosoftContact = {
  ...require('./get'),
  ...require('./create'),
  ...require('./delete')
}


module.exports = MicrosoftContact