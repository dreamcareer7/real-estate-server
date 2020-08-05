/**
 * @namespace GoogleContact
 */

const GoogleContact = {
  ...require('./get'),
  ...require('./create')
}


module.exports = GoogleContact