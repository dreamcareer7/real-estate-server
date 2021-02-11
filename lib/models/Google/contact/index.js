/**
 * @namespace GoogleContact
 */

const GoogleContact = {
  ...require('./get'),
  ...require('./create'),
  ...require('./update'),
  ...require('./delete'),
  ...require('./action')
}


module.exports = GoogleContact