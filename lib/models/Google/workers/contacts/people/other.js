const { refineOtherContacts } = require('./helpers/refine')
const { processConfirmed, processDeleted } = require('./helpers/process')

const GoogleCredential = {
  ...require('../../../credential/update')
}


const syncOtherContacts = async (google, credential) => {
  try {

    const { otherContacts, syncToken } = await google.listOtherContacts(credential.other_contacts_sync_token)
    const { confirmed, deleted } = refineOtherContacts(otherContacts)

    const createdNum = await processConfirmed(credential, confirmed, true)
    const deletedNum = await processDeleted(credential, deleted)

    if (syncToken) {
      await GoogleCredential.updateOtherContactsSyncToken(credential.id, syncToken)
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
  syncOtherContacts
}



/*
  const otherContactWorker = require('./contacts/people/other')

  // Other Contacts
  if ( credential.scope_summary && credential.scope_summary.includes('contacts.other.read') ) {
    const otherContactsResult = await otherContactWorker.syncOtherContacts(google, credential)

    if ( !otherContactsResult.status ) {
      const message = 'Job Error - SyncGoogleContacts Failed [Google To Rechat - other-contacts]'
      await handleException(userJob, message, otherContactsResult.ex)
      return
    }

    synced_contacts_num += (otherContactsResult.createdNum || 0)
  }
*/