// const config = require('../../../../../config')

// const ContactIntegration = require('../../../../../ContactIntegration')
// const GoogleContact      = require('../../../../contact')
// const Contact = {
//   ...require('../../../../../Contact/manipulate')
// }

// const _REASON = config.google_integration.contact_update_reason


/* Original Implementation

  Tip: When a contact is recovered on https://contacts.google.com/ , contact's identifier won't change.

  We dont yet support restoreMany for Rechat contacts, so this method wont be used untill further notice.

  Usage:
    Add the below three lines into the ./process.js:processConfirmed()

    const { recoverGoogleContacts } = require('./recover')
    const recoveredGContacts = oldGContacts.filter(c => c.deleted_at)
    await recoverGoogleContacts(credential, recoveredGContacts)



  const recoverGoogleContacts = async (credential, recoveredGContacts) => {
    if ( recoveredGContacts.length === 0 ) {
      return
    }

    const recoveredEntryIds = recoveredGContacts.map(c => c.entry_id)
    const googleContacts = await GoogleContact.getByEntryIds(credential.id, recoveredEntryIds)

    const googleContactIds = googleContacts.map(c => c.id)
    const integrationRecords = await ContactIntegration.getByGoogleIds(googleContactIds)

    const integrationRecordIds = integrationRecords.map(c => c.id)
    const contactIds = integrationRecords.map(c => c.contact)

    await GoogleContact.restoreMany(googleContactIds)
    await ContactIntegration.restoreMany(integrationRecordIds)

    // All of the above logic of this method is correct, but we dont yet support restoreMany for Rechat contacts,
    // So this method wont be used untill further notice.
    await Contact.delete(contactIds, credential.user, _REASON)
  }


  module.exports = {
    recoverGoogleContacts
  }
*/