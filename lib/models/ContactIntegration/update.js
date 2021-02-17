const db = require('../../utils/db.js')
const Context = require('../Context')


/**
 * @param {UUID[]} contacts
 * @param {String} origin source of change
 */
const resetEtagByContact = async function (contacts, origin, event) {
  Context.log('resetEtagByContact', event, contacts, origin)

  // reset local_etag of all records with same contact id
  if ( origin === 'rechat' ) {
    return await db.select('contact_integration/reset_etag_by_contact', [contacts])
  }

  return await db.select('contact_integration/reset_etag_by_contact_and_origin', [contacts, origin])
}


module.exports = {
  resetEtagByContact
}