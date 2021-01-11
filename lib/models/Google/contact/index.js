/**
 * @namespace GoogleContact
 */

const GoogleContact = {
  ...require('./get'),
  ...require('./create'),
  ...require('./update'),
  ...require('./delete')
}


module.exports = GoogleContact