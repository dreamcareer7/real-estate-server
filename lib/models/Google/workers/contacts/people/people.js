const Context = require('../../../../Context')
const User = require('../../../../User')
const Orm     = {
  ...require('../../../../Orm/index'),
  ...require('../../../../Orm/context'),
}
const { refineConnections, refineOtherContacts } = require('./helpers/refine')
const { processConfirmed, processDeleted } = require('./helpers/process')
const { updateContactsSyncToken, updateOtherContactsSyncToken } = require('../../../credential/update')

const ContactIntegration = require('../../../../ContactIntegration')
const Contact = {
  ...require('../../../../Contact/get'),
  ...require('../../../../Contact/fast_filter'),
}


const googleToRechat = async (google, credential) => {
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

async function retrieveContacts(credential, contactIds) {
  const associations = ['contact.attributes']

  const user = await User.get(credential.user)
  Context.set({ user })
  Orm.setEnabledAssociations(associations)

  const models   = await Contact.getAll(contactIds)
  const contacts = await Orm.populate({ models, associations })

  return contacts
}

async function handleCreated (google, credential, contactIds) {
  const contacts = await retrieveContacts(credential, ['8c5d58b6-db84-41e7-9490-59ebe7c80b92'])

  const arr = contacts.map(contact => {
    const birthday = new Date(contact.birthday)

    const urls = contact.attributes.filter(a => a.attribute_type === 'website' ).map(a => {
      return {
        value: a.text
      }
    })

    const addresses = contact.address.map(a => {
      return {
        type: a.extra,
        streetAddress: a.line1,
        city: a.city,
        postalCode: a.postcode,
        country: a.country,
        countryCode: a.country,
      }
    })

    const emailAddresses = contact.attributes.filter(a => a.attribute_type === 'email' ).map(a => {
      return {
        type: a.label,
        value: a.text
      }
    })

    const phoneNumbers = contact.attributes.filter(a => a.attribute_type === 'phone_number' ).map(a => {
      return {
        type: a.label,
        value: a.text
      }
    })

    const biographies = contact.attributes.filter(a => a.attribute_type === 'note' && a.is_primary ).map(a => {
      return {
        contentType: 'TEXT_PLAIN',
        value: a.text
      }
    })

    return {
      resource: {
        names: [
          {
            givenName: `specialxx-${contact.first_name}`,
            familyName: contact.last_name,
            middleName: contact.middle_name
          }
        ],
        nicknames: [
          {
            value: contact.nickname
          }
        ],
        birthdays: [
          {
            date: {
              year: birthday.getFullYear(),
              month: birthday.getMonth() + 1,
              day: birthday.getDate()
            }
          }
        ],
        urls,
        addresses,
        emailAddresses,
        phoneNumbers,
        biographies,
        organizations: [
          {
            name: contact.company,
            title: contact.job_title
          }
        ]
      }
    }
  })

  const xres = await google.batchInsertContacts(arr)
  console.log('xres.confirmed', JSON.stringify(xres.confirmed))
  console.log('xres.error', JSON.stringify(xres.error))
}

async function handleUpdated (google) {
  const updatingArr = [{
    "resource_id": "people/c1504706431892127783",
    "updatePersonFields": "names",
    "resource": {
      "etag": "%EigBAj0DBAUGBwgJPgoLPwwNDg8QQBESExQVFhc1GTQ3HyEiIyQlJicuGgQBAgUHIgxkeHdvTWdaWnBYbz0=",
      "names": [
        {
          "givenName": "by-api-givenName"
        }
      ]
    }
  }]

  const xres = await google.batchUpdateContacts(updatingArr)
  console.log('xres.confirmed', JSON.stringify(xres.confirmed))
  console.log('xres.error', JSON.stringify(xres.error))
}

async function handleDeleted () {
}

const rechatToGoogle = async (google, credential, last_updated_gt) => {
  try {
    
    const created = await Contact.fastFilter(credential.brand, [], { created_gte: last_updated_gt })
    const updated = await Contact.fastFilter(credential.brand, [], { updated_gte: last_updated_gt })
    const deleted = await Contact.fastFilter(credential.brand, [], { deleted_gte: last_updated_gt })

    let toCreateIds = []
    let toUpdateIds = []
    let toDeleteIds = []

    async function retrieveCreated () {
      const intRecords = await ContactIntegration.getByContacts(created.ids)
      const alreadySyncedContactIds = intRecords.filter(r => r.contact)
      const toCreateContactIds = created.ids.filter(cid => !alreadySyncedContactIds.includes(cid))
      const toUpdateContactIds = created.ids.filter(cid => alreadySyncedContactIds.includes(cid))

      toCreateIds = [...new Set(toCreateIds.concat(toCreateContactIds))]
      toUpdateIds = [...new Set(toUpdateIds.concat(toUpdateContactIds))]
    }

    async function retrieveUpdated () {
      const intRecords = await ContactIntegration.getByContacts(updated.ids)
      const alreadySyncedContactIds = intRecords.filter(r => r.contact)
      const toUpdateContactIds = updated.ids.filter(cid => alreadySyncedContactIds.includes(cid))
      const toCreateContactIds = updated.ids.filter(cid => !alreadySyncedContactIds.includes(cid))

      toCreateIds = [...new Set(toCreateIds.concat(toCreateContactIds))]
      toUpdateIds = [...new Set(toUpdateIds.concat(toUpdateContactIds))]
    }

    async function retrieveDeleted () {
      const intRecords = await ContactIntegration.getByContacts(deleted.ids)
      const alreadySyncedContactIds = intRecords.filter(r => r.contact)
      const toDeleteContactIds = deleted.ids.filter(cid => alreadySyncedContactIds.includes(cid))

      toDeleteIds = toDeleteContactIds
    }
    
    await retrieveCreated()
    await retrieveUpdated()
    await retrieveDeleted()
    
    console.log('toCreateIds', toCreateIds)
    console.log('toUpdateIds', toUpdateIds)
    console.log('toDeleteContactIds', toDeleteIds)

    await handleCreated(google, credential, toCreateIds)

    throw new Error('temp err!')

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