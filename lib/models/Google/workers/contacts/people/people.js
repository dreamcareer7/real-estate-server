const Context = require('../../../../Context')

const { refineConnections, refineOtherContacts } = require('./helpers/refine')
const { processConfirmed, processDeleted } = require('./helpers/process')
const { updateContactsSyncToken, updateOtherContactsSyncToken } = require('../../../credential/update')



const syncPeople = async (google, credential) => {
  try {

    let createdNum = 0
    let deletedNum = 0

    const contactsResult = await google.listConnections(credential.contacts_sync_token)
    const { confirmed: confirmedConnections, deleted: deletedConnections } = refineConnections(contactsResult.connections)

    Context.log('SyncGoogleContacts - confirmedConnections.length', confirmedConnections.length)
    Context.log('SyncGoogleContacts - deletedConnections.length', deletedConnections.length)

    const numOfCreated = await processConfirmed(credential, confirmedConnections, false)
    const numOfDeleted = await processDeleted(credential, deletedConnections)

    Context.log('SyncGoogleContacts - numOfCreated', numOfCreated)
    Context.log('SyncGoogleContacts - numOfDeleted', numOfDeleted)

    createdNum += numOfCreated
    deletedNum += numOfDeleted

    if (contactsResult.syncToken) {
      await updateContactsSyncToken(credential.id, contactsResult.syncToken)
    }


    if (credential?.scope_summary?.includes('contacts.other.read')) {

      const otherContactsResult = await google.listOtherContacts(credential.other_contacts_sync_token)
      const { confirmed: confirmedOther, deleted: deletedOther } = refineOtherContacts(otherContactsResult.otherContacts)
    
      /*
        Handling this specific scenario:
  
        If an other-contact is updated by user in Google, then it will become a regular contacts and be deleted from other-contacts.
        So in this case we will fetch one deleted other-contact record and one created/updated regular-contact record, Both of them have the same resource/entry id!.
        We have to eliminate this specific contact from deletedOther array.
        Scroll down to check the valid sample (Scenario #1)
      */
      const confirmedConnectionResourceIds = confirmedConnections.map(record => record.resource_id)
      const deletedOtherFiltered = deletedOther.filter(record => !confirmedConnectionResourceIds.includes(record.resource_id))

      const numOfCreated = await processConfirmed(credential, confirmedOther, true)
      const numOfDeleted = await processDeleted(credential, deletedOtherFiltered)
  
      createdNum += numOfCreated
      deletedNum += numOfDeleted

      if (otherContactsResult.syncToken) {
        await updateOtherContactsSyncToken(credential.id, otherContactsResult.syncToken)
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


/*
  Scenario #1

  // Deleted other-contact
  {
    "otherContacts": [
      {
        "resourceName": "otherContacts/c2638222672945904267",
        "etag": "%EgU3CT4BLhoBAg==",
        "metadata": {
          "sources": [
            {
              "type": "OTHER_CONTACT",
              "id": "249cd98b0b527a8b"
            }
          ],
          "deleted": true,
          "objectType": "PERSON"
        }
      }
    ]
  }


  // created/updated regular-contact with same indentifier (c2638222672945904267)
  {
    "connections": [
      {
        "resourceName": "people/c2638222672945904267",
        "etag": "%EgU3CT4BLhoEAgEHBSIMbWVZejFVL01JVFE9",
        "metadata": {
          "sources": [
            {
              "type": "CONTACT",
              "id": "249cd98b0b527a8b",
              "etag": "#meYz1U/MITQ=",
              "updateTime": "2020-12-29T14:21:59.167Z"
            }
          ],
          "objectType": "PERSON"
        },
        "emailAddresses": [
          {
            "metadata": {
              "primary": true,
              "source": {
                "type": "CONTACT",
                "id": "249cd98b0b527a8b"
              }
            },
            "value": "pafikiw965@28woman.com"
          }
        ]
      }
    ]
  }
*/