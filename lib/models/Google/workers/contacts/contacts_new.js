const GoogleContact = require('../../contact')

const { refineConnections, refineOtherContacts } = require('./refine')



const syncContacts_new = async (google, credential) => {
  const records = []

  try {

    const { connections, syncToken } = await google.listConnections(credential.contacts_sync_token)
    const contacts = refineConnections(connections)

    if (!contacts.length) {
      return {
        status: true,
        syncToken
      }
    }

    const olfGoogldeContacts = await GoogleContact.getByGoogleCredential(credential.id)
    const oldEntryIds = olfGoogldeContacts.map(contact => contact.entry_id)

    for (const contact of contacts) {
      if ( oldEntryIds.includes(contact.entry_id) ) {
        records.push({
          google_credential: credential.id,
          entry_id: contact.entry_id,
  
          etag: contact.etag,
          resource_id: contact.resource_id,
          resource: JSON.stringify(contact),
          other: false
        })
      }
    }

    await GoogleContact.create(records)

    return {
      status: true,
      syncToken
    }

  } catch (ex) {

    return  {
      status: false,
      ex
    }
  }
}

const syncOtherContacts_new = async (google, credential) => {
  const records = []

  try {

    const { otherContacts, syncToken } = await google.listOtherContacts(credential.other_contacts_sync_token)
    const contacts = refineOtherContacts(otherContacts)

    if (!contacts.length) {
      return {
        status: true,
        syncToken
      }
    }

    const olfGoogldeContacts = await GoogleContact.getByGoogleCredential(credential.id)
    const oldEntryIds = olfGoogldeContacts.map(contact => contact.entry_id)

    for (const contact of contacts) {
      if ( oldEntryIds.includes(contact.entry_id) ) {
        records.push({
          google_credential: credential.id,
          entry_id: contact.entry_id,

          etag: contact.etag,
          resource_id: contact.resource_id,
          resource: JSON.stringify(contact),
          other: true
        })
      }
    }

    await GoogleContact.create(records)

    return {
      status: true,
      syncToken
    }

  } catch (ex) {

    return  {
      status: false,
      ex
    }
  }
}


module.exports = {
  syncContacts_new,
  syncOtherContacts_new
}