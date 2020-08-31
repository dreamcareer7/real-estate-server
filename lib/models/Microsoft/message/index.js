/**
 * @namespace MicrosoftMessage
 */


const MicrosoftMessage = {
  ...require('./create'),
  ...require('./get'),
  ...require('./update'),
  ...require('./filter'),
  ...require('./campaign'),
  ...require('./delete'),
  ...require('./email'),
  ...require('./batch'),
  ...require('./remote')
}

module.exports = MicrosoftMessage