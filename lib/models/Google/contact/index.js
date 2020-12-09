/**
 * @namespace GoogleContact
 */

const GoogleContact = {
  ...require('./get'),
  ...require('./create'),
  ...require('./update')
}


module.exports = GoogleContact