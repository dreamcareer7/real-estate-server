/**
 * @namespace GoogleContact
 */

const GoogleContact = {
  ...require('./get'),
  ...require('./create'),
  ...require('./update'),
  ...require('./delete'),
  ...require('./support')
}


module.exports = GoogleContact