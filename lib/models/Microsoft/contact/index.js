/**
 * @namespace MicrosoftContact
 */

const MicrosoftContact = {
  ...require('./get'),
  ...require('./create')
}


module.exports = MicrosoftContact