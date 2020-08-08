/**
 * @namespace GoogleMessage
 */


const GoogleMessage = {
  ...require('./create'),
  ...require('./get'),
  ...require('./update'),
  ...require('./filter'),
  ...require('./campaign'),
  ...require('./delete'),
  ...require('./email'),
  ...require('./batch'),
  ...require('./remote'),
  ...require('./watch')
}

module.exports = GoogleMessage