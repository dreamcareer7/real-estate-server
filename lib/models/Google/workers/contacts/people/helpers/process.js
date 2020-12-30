const { groupBy, keyBy } = require('lodash')

const ContactIntegration = require('../../../../../ContactIntegration')
const GoogleContact      = require('../../../../contact')
const ContactAttribute   = require('../../../../../Contact/attribute/get')
const Contact = {
  ...require('../../../../../Contact/get'),
  ...require('../../../../../Contact/fast_filter'),
  ...require('../../../../../Contact/manipulate')
}

const { parseAttributes, findNewAttributes } = require('./attributes')
const { targetKeys } = require('./constants')



const handleNewRecords = async (credential, contactIds, googleContacts) => {
  const integrationRecords = []

  const contacts = await Contact.getAll(contactIds, credential.user)
  const contactsByGoogleId = keyBy(contacts, 'google_id')

  for (const cgc of googleContacts) {
    integrationRecords.push({
      google_id: cgc.id,
      microsoft_id: null,
      contact: contactsByGoogleId[cgc.id].id,
      origin: 'google',
      etag: cgc.etag,
      local_etag: cgc.etag
    })
  }

  await ContactIntegration.insert(integrationRecords)
}

const handleToUpdateRecords = async (credential, contactIds, googleContacts) => {
  const integrationRecords = []

  const contacts = await Contact.getAll(contactIds, credential.user)
  const contactsByGoogleId = keyBy(contacts, 'google_id')

  for (const ugc of googleContacts) {
    if (contactsByGoogleId[ugc.id]) {
      integrationRecords.push({
        google_id: ugc.id,
        etag: ugc.etag,
        local_etag: ugc.etag,
        contact: contactsByGoogleId[ugc.id].id
      })
    }
  }

  await ContactIntegration.gupsert(integrationRecords)



  // This is a temporary hack for populating contact-integration records of alredy synced contacts
  // We can delete this part after making sure all synced contacts have relevant contact-integration records.
  const updatedGContactIds = googleContacts.map(gc => gc.id) // gc.id ==> contact_integration.google_id
  const alreadyCreatedRecords = await ContactIntegration.getByGoogleIds(updatedGContactIds)

  const alreadyHandledGContactIds               = alreadyCreatedRecords.map(record => record.google_id)
  const contactsWithoutIntegrationRecords       = contacts.filter(c => !alreadyHandledGContactIds.includes(c.google_id))
  const contactIdsWithoutIntegrationRecords     = contactsWithoutIntegrationRecords.map(c => c.id) // c.id ==> contact_integration.contact
  const googleContactsWithoutIntegrationRecords = googleContacts.filter(gc => !alreadyHandledGContactIds.includes(gc.id))
  
  await handleNewRecords(credential, contactIdsWithoutIntegrationRecords, googleContactsWithoutIntegrationRecords)
}

const processConfirmed = async (credential, confirmed, parked) => {
  if ( confirmed.length === 0 ) {
    return 0
  }

  const newGContacts         = []
  const toUpdateGContacts    = []
  const toExcludeGContactIds = []

  const newContacts        = []
  const toUpdateContactIds = []
  const toUpdateContacts   = []

  const contactsMap = {}

  const entryIds      = confirmed.map(c => c.entry_id)
  const oldGContacts  = await GoogleContact.getByEntryIds(credential.id, entryIds)
  const contactGroups = await GoogleContact.getRefinedContactGroups(credential.id)

  const oldGContactEntryIds   = oldGContacts.map(c => c.entry_id)
  const oldGContactsByEntryId = keyBy(oldGContacts, 'entry_id')

  for (const contact of confirmed) {
    const temp = {
      google_credential: credential.id,
      entry_id: contact.entry_id,

      etag: contact.etag,
      resource_id: contact.resource_id,
      resource: JSON.stringify(contact),
      parked
    }

    if (!oldGContactEntryIds.includes(contact.entry_id)) {
      // New Contact
      newGContacts.push(temp)

    } else {

      const oldGContact = oldGContactsByEntryId[contact.entry_id]

      // set google_contacts.etag as null for initial sync process
      if ( oldGContact.etag !== contact.etag ) {

        const result = await Contact.fastFilter(credential.brand, [], { google_id: oldGContact.id, parked: oldGContact.parked })
  
        if (result.ids[0]) {
          // Contacts to be updated
          toUpdateContactIds.push(result.ids[0])
          contactsMap[result.ids[0]] = { contact, oldGContact }
        } else {
          // already deleted contacts by user
          toExcludeGContactIds.push(oldGContact.id)
        }
  
        // Google-contacts to be updated
        toUpdateGContacts.push(temp)
      }
    }
  }

  if ( toUpdateContactIds.length ) {
    const contactsAtts = await ContactAttribute.getForContacts(toUpdateContactIds)
    const refinedAtts  = groupBy(contactsAtts, function(entry) { return entry.contact })

    for (const id in refinedAtts) {
      const attributes = findNewAttributes(contactsMap[id], refinedAtts[id], contactGroups)
      toUpdateContacts.push({ id, attributes, parked })
    }
  }


  const createdGContacts = await GoogleContact.create(newGContacts)

  for (const cgc of createdGContacts) {

    /** @type {IContactInput} */
    const contact = {
      user: credential.user,
      google_id: cgc.id,
      attributes: [{ attribute_type: 'source_type', text: 'Google' }],
      parked
    }

    for (const key in cgc.resource) {
      if (targetKeys.indexOf(key) >= 0) {
        const attributes   = parseAttributes(key, cgc.resource, contactGroups)
        contact.attributes = contact.attributes.concat(attributes)
      }
    }

    newContacts.push(contact)
  }

  const createdContactIds = await Contact.create(newContacts, credential.user, credential.brand, 'google_integration', { activity: false, relax: true, get: false })
  const updatedContactIds = await Contact.update(toUpdateContacts, credential.user, credential.brand, 'google_integration')
  const updatedGContacts  = await GoogleContact.create(toUpdateGContacts)

  const updatedGContactsExcludingDeleted = updatedGContacts.filter(ugc => !toExcludeGContactIds.includes(ugc.id))

  await handleNewRecords(credential, createdContactIds, createdGContacts)
  await handleToUpdateRecords(credential, updatedContactIds, updatedGContactsExcludingDeleted)

  return createdGContacts.length
}

const processDeleted = async (credential, deleted) => {
  if ( deleted.length === 0 ) {
    return 0
  }

  const entryIds = deleted.map(c => c.entry_id)
  const googleContacts = await GoogleContact.getByEntryIds(credential.id, entryIds)

  const googleContactIds = googleContacts.map(c => c.id)
  const integrationRecords = await ContactIntegration.getByGoogleIds(googleContactIds)

  const integrationRecordIds = integrationRecords.map(c => c.id)
  const contactIds = integrationRecords.map(c => c.contact)

  await GoogleContact.deleteMany(googleContactIds)
  await ContactIntegration.deleteMany(integrationRecordIds)
  await Contact.delete(contactIds, credential.user, 'google_integration')

  return integrationRecordIds.length
}


module.exports = {
  processConfirmed,
  processDeleted
}