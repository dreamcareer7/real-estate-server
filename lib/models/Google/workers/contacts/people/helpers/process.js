const { groupBy, keyBy } = require('lodash')

const ContactIntegration = require('../../../../../ContactIntegration')
const GoogleContact      = require('../../../../contact')
const ContactAttribute   = require('../../../../../Contact/attribute/get')
const Contact = {
  ...require('../../../../../Contact/get'),
  ...require('../../../../../Contact/fast_filter'),
  ...require('../../../../../Contact/manipulate'),
}

const { parseAttributes, findNewAttributes } = require('./attributes')
const { targetKeys } = require('./constants')



const handleNewRecords = async (credential, contactIds, googleContacts) => {
  const new_integration_records = []

  const createdContacts = await Contact.getAll(contactIds, credential.user)
  const createdContactsByGoogleId = keyBy(createdContacts, 'google_id')

  for (const cgc of googleContacts) {
    new_integration_records.push({
      google_id: cgc.id,
      microsoft_id: null,
      contact: createdContactsByGoogleId[cgc.id].id,
      origin: 'google',
      etag: cgc.etag,
      local_etag: cgc.etag
    })
  }

  console.log('\n\n')
  console.log('---- handleNewRecords new_integration_records.length', new_integration_records.length)
  console.log('---- handleNewRecords new_integration_records', new_integration_records)
  const inserted = await ContactIntegration.insert(new_integration_records)
  console.log('---- handleNewRecords inserted.length', inserted.length)
  console.log('---- handleNewRecords inserted', inserted)
}

const handleToUpdateRecords = async (credential, contactIds, googleContacts) => {
  const to_update_integration_records = []

  const updatedContacts = await Contact.getAll(contactIds, credential.user)
  const updatedContactsByGoogleId = keyBy(updatedContacts, 'google_id')

  for (const ugc of googleContacts) {
    to_update_integration_records.push({
      google_id: ugc.id,
      etag: ugc.etag,
      local_etag: ugc.etag,
      contact: updatedContactsByGoogleId[ugc.id].id
    })
  }

  console.log('\n\n')
  console.log('---- handleToUpdateRecords to_update_integration_records.length', to_update_integration_records.length)
  const updated  = await ContactIntegration.gupsert(to_update_integration_records)
  console.log('---- handleToUpdateRecords updated.length', updated.length)
  console.log('---- handleToUpdateRecords  updated', updated)


  // This is a temporary hack for populating contact-integration records of alredy synced contacts
  // We can delete this part after making sure all synced contacts have relevant contact-integration records.
  const updatedGContactIds = googleContacts.map(ugc => ugc.id) // ugc.id ==> contact_integration.google_id
  const alreadyCreatedRecords = await ContactIntegration.getByGoogleIds(updatedGContactIds)

  const alreadyHandledGContactIds               = alreadyCreatedRecords.map(record => record.google_id)
  const contactsWithoutIntegrationRecords       = updatedContacts.filter(uc => !alreadyHandledGContactIds.includes(uc.google_id))
  const contactIdsWithoutIntegrationRecords     = contactsWithoutIntegrationRecords.map(c => c.id) // c.id ==> contact_integration.google_id
  const googleContactsWithoutIntegrationRecords = googleContacts.filter(ugc => !alreadyHandledGContactIds.includes(ugc.google_id))

  await handleNewRecords(credential, contactIdsWithoutIntegrationRecords, googleContactsWithoutIntegrationRecords)
}

const processConfirmed = async (credential, confirmed, parked) => {
  if ( confirmed.length === 0 ) {
    return 0
  }

  // temp
  const skipped = []

  const newGContacts      = []
  const toUpdateGContacts = []

  const newContacts      = []
  const updateContactIds = []
  const updatedContacts  = []

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
      // New Contacts
      newGContacts.push(temp)

    } else {

      const oldGContact = oldGContactsByEntryId[contact.entry_id]

      // set google_contacts.etag as null for initial sync process
      if ( oldGContact.etag !== contact.etag ) {

        const result = await Contact.fastFilter(credential.brand, [], { google_id: oldGContact.id, parked: oldGContact.parked })
  
        if (result.ids[0]) {
          updateContactIds.push(result.ids[0])
          contactsMap[result.ids[0]] = { contact, oldGContact }
        }
  
        // Updated Contacts
        toUpdateGContacts.push(temp)

        // temp
      } else {
        skipped.push(contact.id)
      }
    }
  }

  console.log('---- processConfirmed newGContacts.length', newGContacts.length)
  console.log('---- processConfirmed toUpdateGContacts.length', toUpdateGContacts.length)
  console.log('---- processConfirmed updateContactIds.length', updateContactIds.length)
  console.log('---- processConfirmed skipped.length', skipped.length)

  if ( updateContactIds.length ) {
    const contactsAtts = await ContactAttribute.getForContacts(updateContactIds)
    const refinedAtts  = groupBy(contactsAtts, function(entry) { return entry.contact })

    for (const id in refinedAtts) {
      const attributes = findNewAttributes(contactsMap[id], refinedAtts[id])

      if (attributes.length) {
        updatedContacts.push({ id, attributes, parked })
      }
    }
  }

  console.log('---- processConfirmed updatedContacts.length', updatedContacts.length)

  const createdGContacts = await GoogleContact.create(newGContacts)
  console.log('---- processConfirmed createdGContacts.length', createdGContacts.length)

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

  console.log('---- processConfirmed newContacts.length', newContacts.length)


  const createdContactIds = await Contact.create(newContacts, credential.user, credential.brand, 'google_integration', { activity: false, relax: true, get: false })
  const updatedContactIds = await Contact.update(updatedContacts, credential.user, credential.brand, 'google_integration')
  const updatedGContacts  = await GoogleContact.create(toUpdateGContacts)

  console.log('---- processConfirmed createdContactIds.length', createdContactIds.length)
  console.log('---- processConfirmed updatedContactIds.length', updatedContactIds.length)
  console.log('---- processConfirmed updatedGContacts.length', updatedGContacts.length)

  await handleNewRecords(credential, createdContactIds, createdGContacts)
  await handleToUpdateRecords(credential, updatedContactIds, updatedGContacts)

  return createdGContacts.length
}

const processDeleted = async (credential, deleted, parked) => {
  if ( deleted.length === 0 ) {
    return 0
  }

  const entryIds = deleted.map(c => c.entry_id)
  const googleContacts = await GoogleContact.getByEntryIds(credential.id, entryIds)

  const googleContactIds = googleContacts.map(c => c.id)
  const integrationRecords = await ContactIntegration.getByGoogleIds(googleContactIds)

  const integrationRecordIds = integrationRecords.map(c => c.id)
  const contactIds = integrationRecords.map(c => c.contact)


  // delete oldGContacts
  // delete integrationRecordIds
  // delete contactIds


  return integrationRecordIds.length
}


module.exports = {
  processConfirmed,
  processDeleted
}