/**
 * @namespace MicrosoftMailFolder
 */

const MicrosoftMailFolder = {
  ...require('./get'),
  ...require('./upsert')
}


module.exports = MicrosoftMailFolder