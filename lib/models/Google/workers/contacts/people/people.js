const { refineConnections, refineOtherContacts } = require('./helpers/refine')
const { processConfirmed, processDeleted } = require('./helpers/process')

const GoogleCredential = {
  ...require('../../../credential/update')
}



const syncPeople = async (google, credential) => {
  try {

    let createdNum = 0
    let deletedNum = 0

    const contactsResult = await google.listConnections(credential.contacts_sync_token)
    const { confirmed: confirmedConnections, deleted: deletedConnections } = refineConnections(contactsResult.connections)

    const numOfCreated = await processConfirmed(credential, confirmedConnections, false)
    const numOfDeleted = await processDeleted(credential, deletedConnections)

    createdNum += numOfCreated
    deletedNum += numOfDeleted

    if (contactsResult.syncToken) {
      await GoogleCredential.updateContactsSyncToken(credential.id, contactsResult.syncToken)
    }


    if (credential?.scope_summary?.includes('contacts.other.read')) {

      const otherContactsResult = await google.listOtherContacts(credential.other_contacts_sync_token)
      const { confirmed: confirmedOther, deleted: deletedOther } = refineOtherContacts(otherContactsResult.otherContacts)
    
      /*
        Handling the below scenario:
  
        If an other-contact is updated by user in Google, then it will become a regular contacts and be deleted from other-contacts.
        So in this case we will fetch one deleted other-contact record and one created/updated regular-contact record, Both of them have the same resource/entry-id!.
        We have to eliminate this specific contact from deletedOther array.
      */
      const confirmedConnectionResourceIds = confirmedConnections.map(record => record.resource_id)
      const deletedOtherFiltered = deletedOther.filter(record => !confirmedConnectionResourceIds.includes(record.resource_id))


      const numOfCreated = await processConfirmed(credential, confirmedOther, true)
      const numOfDeleted = await processDeleted(credential, deletedOtherFiltered)
  
      createdNum += numOfCreated
      deletedNum += numOfDeleted

      if (otherContactsResult.syncToken) {
        await GoogleCredential.updateOtherContactsSyncToken(credential.id, otherContactsResult.syncToken)
      }
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
  syncPeople
}