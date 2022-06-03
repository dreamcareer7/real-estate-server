const ContactIntegration = require('../../../../ContactIntegration')
const GoogleContact      = require('../../../contact')
const Contact = require('../../../../Contact/fast_filter')

const { refineConnections, refineOtherContacts } = require('./helpers/refine')
const { processConfirmed, processDeleted } = require('./receiver')
const { updateContactsSyncToken, updateOtherContactsSyncToken } = require('../../../credential/update')
const { handleCreated, handleUpdated, handleDeleted } = require('./dispatcher')
const Context = require('../../../../Context')


const googleToRechat = async (google, credential) => {
  try {
    let upsertedNum = 0
    let deletedNum  = 0

    const contactsResult = await google.listConnections(credential.contacts_sync_token)
    const { confirmed: confirmedConnections, deleted: deletedConnections } = refineConnections(contactsResult.connections)
    const numOfUpserted = await processConfirmed(credential, confirmedConnections, false)
    const numOfDeleted  = await processDeleted(credential, deletedConnections)

    upsertedNum += numOfUpserted
    deletedNum  += numOfDeleted
    Context.log('syncGoogleContacts', 'after process', JSON.stringify({upsertedNum, deletedNum, numOfUpserted, numOfDeleted}) )
    if (contactsResult.syncToken) {
      await updateContactsSyncToken(credential.id, contactsResult.syncToken)
    }


    if (credential?.scope_summary?.includes('contacts.other.read')) {

      const otherContactsResult = await google.listOtherContacts(credential.other_contacts_sync_token)
      const { confirmed: confirmedOther, deleted: deletedOther } = refineOtherContacts(otherContactsResult.otherContacts)
      Context.log('syncGoogleContacts', 'after otherContactsResult', confirmedOther.length)
      /*
        Handling this specific scenario:
  
        If an other-contact is updated by user in Google, then it will become a regular contacts and be deleted from other-contacts.
        So in this case we will fetch one deleted other-contact record and one created/updated regular-contact record, Both of them have the same resource/entry id!.
        We have to eliminate this specific contact from deletedOther array.
        Scroll down to check the valid sample (Scenario #1)
      */
      const confirmedConnectionResourceIds = confirmedConnections.map(record => record.resource_id)
      const deletedOtherFiltered = deletedOther.filter(record => !confirmedConnectionResourceIds.includes(record.resource_id))

      const numOfUpserted = await processConfirmed(credential, confirmedOther, true)
      const numOfDeleted  = await processDeleted(credential, deletedOtherFiltered)
      upsertedNum += numOfUpserted
      deletedNum  += numOfDeleted
      
      Context.log('syncGoogleContacts', 'after process other contacts', JSON.stringify({upsertedNum, deletedNum, numOfUpserted, numOfDeleted}) )  
      if (otherContactsResult.syncToken) {
        await updateOtherContactsSyncToken(credential.id, otherContactsResult.syncToken)
      }
    }

    Context.log('syncGoogleContacts', 'before return', JSON.stringify({upsertedNum, deletedNum}) )
    return {
      status: true,
      upsertedNum,
      deletedNum
    }

  } catch (ex) {
    Context.log('syncGoogleContacts', 'on catch', JSON.stringify(ex))
    return  {
      status: false,
      ex
    }
  }
}

const rechatToGoogle = async (google, credential, last_updated_gt) => {
  try {

    const created = await Contact.fastFilter(credential.brand, [], { created_gte: last_updated_gt, parked: false })
    const updated = await Contact.fastFilter(credential.brand, [], { updated_gte: last_updated_gt, parked: false })
    const deleted = await Contact.fastFilter(credential.brand, [], { deleted_gte: last_updated_gt, parked: false })

    let toCreateIds = []
    let toUpdateIds = []
    let toDeleteIds = []

    const retrieveCreated = async () => {
      const googleContacts = await GoogleContact.getByRechatContacts(credential.id, created.ids)
      const alreadySyncedContactIds = googleContacts.map(gc => gc.contact)
      const toCreateContactIds = created.ids.filter(cid => !alreadySyncedContactIds.includes(cid))

      toCreateIds = [...new Set(toCreateIds.concat(toCreateContactIds))]
    }

    const retrieveUpdated = async () => {
      const googleContacts = await GoogleContact.getByRechatContacts(credential.id, updated.ids)
      const alreadySyncedContactIds  = googleContacts.map(gc => gc.contact)
      const alreadySyncedGContactIds = googleContacts.map(gc => gc.id)
      const intRecords = await ContactIntegration.getByGoogleIds(alreadySyncedGContactIds)
      const alreadySyncedAndLocalyUpdatedContactIds = intRecords.filter(r => r.etag !== r.local_etag).map(r => r.contact)
      const toCreateContactIds = updated.ids.filter(cid => !alreadySyncedContactIds.includes(cid))
      const toUpdateContactIds = updated.ids.filter(cid => alreadySyncedAndLocalyUpdatedContactIds.includes(cid))

      toCreateIds = [...new Set(toCreateIds.concat(toCreateContactIds))]
      toUpdateIds = [...new Set(toUpdateIds.concat(toUpdateContactIds))]
    }

    const retrieveDeleted = async () => {
      const googleContacts = await GoogleContact.getByRechatContacts(credential.id, deleted.ids)
      const alreadySyncedContactIds = googleContacts.map(gc => gc.contact)
      const toDeleteContactIds      = deleted.ids.filter(cid => alreadySyncedContactIds.includes(cid))

      toDeleteIds = toDeleteContactIds
    }

    await retrieveCreated()
    await retrieveUpdated()
    await retrieveDeleted()

    await handleCreated(google, credential, toCreateIds)
    await handleUpdated(google, credential, toUpdateIds)
    await handleDeleted(google, credential, toDeleteIds)

    return  {
      status: true
    }

  } catch (ex) {

    return  {
      status: false,
      ex
    }
  }
}


module.exports = {
  googleToRechat,
  rechatToGoogle
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