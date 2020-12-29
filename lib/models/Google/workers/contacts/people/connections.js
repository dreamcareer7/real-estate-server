const { refineConnections } = require('./helpers/refine')
const { processConfirmed, processDeleted } = require('./helpers/process')

const GoogleCredential = {
  ...require('../../../credential/update')
}


const syncContacts = async (google, credential) => {
  try {

    const { connections, syncToken } = await google.listConnections(credential.contacts_sync_token)
    const { confirmed, deleted } = refineConnections(connections)

    const createdNum = await processConfirmed(credential, confirmed, false)
    const deletedNum = await processDeleted(credential, deleted)

    if (syncToken) {
      await GoogleCredential.updateContactsSyncToken(credential.id, syncToken)
    }

    return {
      status: true,
      createdNum,
      deletedNum
    }

  } catch (ex) {

    return  {
      status: false,
      ex
    }
  }
}


module.exports = {
  syncContacts
}



/*
  const contactWorker = require('./contacts/people/connections')

  // Contacts
  if ( credential.scope_summary && credential.scope_summary.includes('contacts.read') ) {
    const contactsResult = await contactWorker.syncContacts(google, credential)

    if ( !contactsResult.status ) {
      const message = 'Job Error - SyncGoogleContacts Failed [Google To Rechat - contacts]'
      await handleException(userJob, message, contactsResult.ex)
      return
    }

    synced_contacts_num += (contactsResult.createdNum || 0)
  }
*/