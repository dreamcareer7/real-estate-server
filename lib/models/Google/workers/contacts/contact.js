const Context  = require('../../../Context')
const { groupBy, uniqBy } = require('lodash')

const GoogleContact    = require('../../contact')
const ContactAttribute = require('../../../Contact/attribute/get')
const Contact          = {
  ...require('../../../Contact/fast_filter'),
  ...require('../../../Contact/manipulate'),
}

const { refineConnections, refineOtherContacts } = require('./refine')
const { parseAttributes, findNewAttributes } = require('./attributes')

const targetKeys = ['names', 'note', 'photo', 'website', 'birthday', 'organization', 'groupMembership', 'addresses', 'emailes', 'phones']


const syncContacts = async (google, credential) => {
  const credentialId = credential.id
  const brand = credential.brand
  const user  = credential.user
  
  const records            = []
  const toUpdateRecords    = []
  const newContacts        = []
  const toUpdateContacts   = []
  const toUpdateContactIds = []
  const contactsMap        = {}

  let createdNum = 0

  try {

    const { connections, syncToken } = await google.listConnections(credential.contacts_sync_token)
    const contacts = refineConnections(connections)

    if (!contacts.length) {
      return {
        status: true,
        syncToken
      }
    }

    const entryIdsArr       = contacts.map(c => c.entry_id)
    const oldGoogleContacts = await GoogleContact.getByEntryIds(credentialId, entryIdsArr)
    const contactGroups     = await GoogleContact.getRefinedContactGroups(credentialId)
    
    const oldGoogleContactEntryIds   = oldGoogleContacts.map(c => c.entry_id)
    const oldGoogleContactsByEntryId = uniqBy(oldGoogleContacts, 'entry_id')


    // Updated Contacts
    for (const contact of contacts) {
      if ( oldGoogleContactEntryIds.includes(contact.entry_id) ) {

        // const oldGContact = await GoogleContact.getByEntryId(credentialId, contact.entry_id)
        const oldGContact = oldGoogleContactsByEntryId[contact.entry_id]

        if (oldGContact) {

          const result = await Contact.fastFilter(brand, [], { google_id: oldGContact.id, parked: false })

          if (result.ids[0]) {
            toUpdateContactIds.push(result.ids[0])
            contactsMap[result.ids[0]] = { rawData: contact, oldRawData: oldGContact.entry }
          }

          toUpdateRecords.push({ google_credential: credentialId, entry_id: contact.entry_id, entry: JSON.stringify(contact) })
        }

      } else {

        records.push({ google_credential: credentialId, entry_id: contact.entry_id, entry: JSON.stringify(contact) })
      }
    }

    if ( toUpdateContactIds.length ) {
      const contactsAtts = await ContactAttribute.getForContacts(toUpdateContactIds)
      const refinedAtts  = groupBy(contactsAtts, function(entry) { return entry.contact})

      for (const key in refinedAtts) {
        const newAttributes = findNewAttributes(contactsMap[key], refinedAtts[key])

        if (newAttributes.length) {
          toUpdateContacts.push({ id: key, parked: false, attributes: newAttributes })
        }
      }
    }

    // New Contacts
    const createdGoogleContacts = await GoogleContact.create(records)

    for (const cgc of createdGoogleContacts) {

      /** @type {IContactInput} */
      const contact = {
        user: user,
        google_id: cgc.id,
        attributes: [{ attribute_type: 'source_type', text: 'Google' }],
        parked: false
      }

      for (const key in cgc.entry) {
        if (targetKeys.indexOf(key) >= 0) {
          const attributes = parseAttributes(key, cgc.entry, contactGroups)
          contact.attributes = contact.attributes.concat(attributes)
        }
      }

      newContacts.push(contact)
    }


    // Updated Contacts
    await GoogleContact.create(toUpdateRecords)
    await Contact.update(toUpdateContacts, user, brand, 'google_integration')

    // New Contacts
    await Contact.create(newContacts, user, brand, 'google_integration', { activity: false, relax: true, get: false })

    createdNum = createdGoogleContacts.length

    return {
      status: true,
      syncToken,
      createdNum
    }

  } catch (ex) {

    return  {
      status: false,
      ex
    }
  }
}

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

    console.log('--- oldEntryIds.length', oldEntryIds.length)
    console.log('--- oldEntryIds', oldEntryIds)

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

    console.log('--- records', records)

    const createdGoogleContacts = await GoogleContact.create(records)
    Context.log('SyncGoogleContacts overwriting-contacts', createdGoogleContacts.length)

    console.log('--- createdGoogleContacts.length', createdGoogleContacts.length)
    console.log('--- createdGoogleContacts', createdGoogleContacts)

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

    const { connections, syncToken } = await google.listOtherContacts(credential.other_contacts_sync_token)
    const contacts = refineOtherContacts(connections)

    if (!contacts.length) {
      return {
        status: true,
        syncToken
      }
    }

    const olfGoogldeContacts = await GoogleContact.getByGoogleCredential(credential.id)
    const oldEntryIds = olfGoogldeContacts.map(contact => contact.entry_id)

    console.log('--- oldEntryIds.length', oldEntryIds.length)
    console.log('--- oldEntryIds', oldEntryIds)

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

    console.log('--- records', records)

    const createdGoogleContacts = await GoogleContact.create(records)
    Context.log('SyncGoogleContacts overwriting-other-contacts', createdGoogleContacts.length)

    console.log('--- createdGoogleContacts.length', createdGoogleContacts.length)
    console.log('--- createdGoogleContacts', createdGoogleContacts)

    // return {
    //   status: false,
    //   ex: 'ex'
    // }

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
  syncContacts,
  syncContacts_new,
  syncOtherContacts_new
}