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



const handleNewRecords = async (credential, createdContactIds, createdGContacts) => {
  const new_integration_records = []

  const createdContacts = await Contact.getAll(createdContactIds, credential.user)
  const createdContactsByGoogleId = keyBy(createdContacts, 'google_id')

  for (const cgc of createdGContacts) {
    new_integration_records.push({
      google_id: cgc.id,
      microsoft_id: null,
      contact: createdContactsByGoogleId[cgc.id],
      origin: 'google',
      etag: cgc.etag,
      local_etag: cgc.etag
    })
  }

  const inserted = await ContactIntegration.insert(new_integration_records)
  console.log('inserted', inserted)
}

const handleToUpdateRecords = async (credential, updatedContactIds, updatedGContacts) => {
  const to_update_integration_records = []

  const UpdatedContacts = await Contact.getAll(updatedContactIds, credential.user)
  const UpdatedContactsByGoogleId = keyBy(UpdatedContacts, 'google_id')

  const updatedGContactIds = updatedGContacts.map(ugc => ugc.id)
  const alreadyCreatedRecords = await ContactIntegration.getByGoogleIds(updatedGContactIds)

  for (const ugc of updatedGContacts) {
    to_update_integration_records.push({
      google_id: ugc.id,
      etag: ugc.etag,
      local_etag: ugc.etag,
      contact: UpdatedContactsByGoogleId[ugc.id]
    })
  }

  const updated  = await ContactIntegration.gupsert(to_update_integration_records)
  console.log('updated', updated)


  // This is a temporary hack for populating contact-integration records of alredy synced contacts
  // We can delete this part after making sure all synced contacts have relevant contact-integration records.
  const alreadyHandledGContactIds               = alreadyCreatedRecords.map(record => record.google_id)
  const contactsWithoutIntegrationRecords       = UpdatedContacts.filter(uc => !alreadyHandledGContactIds.includes(uc.google_id))
  const contactIdsWithoutIntegrationRecords     = contactsWithoutIntegrationRecords.map(c => c.id)
  const googleContactsWithoutIntegrationRecords = updatedGContacts.filter(ugc => !alreadyHandledGContactIds.includes(ugc.google_id))

  await handleNewRecords(credential, contactIdsWithoutIntegrationRecords, googleContactsWithoutIntegrationRecords)
}

const processContacts = async (credential, contacts, parked) => {
  const newGContacts      = []
  const toUpdateGContacts = []

  const newContacts      = []
  const updateContactIds = []
  const updatedContacts  = []

  const contactsMap = {}

  const entryIdsArr   = contacts.map(c => c.entry_id)
  const oldGContacts  = await GoogleContact.getByEntryIds(credential.id, entryIdsArr)
  const contactGroups = await GoogleContact.getRefinedContactGroups(credential.id)

  const oldGContactEntryIds   = oldGContacts.map(c => c.entry_id)
  const oldGContactsByEntryId = keyBy(oldGContacts, 'entry_id')

  for (const contact of contacts) {
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

      if ( oldGContact.etag !== contact.etag ) {

        const result = await Contact.fastFilter(credential.brand, [], { google_id: oldGContact.id, parked: oldGContact.parked })
  
        if (result.ids[0]) {
          updateContactIds.push(result.ids[0])
          contactsMap[result.ids[0]] = { contact, oldGContact }
        }
  
        // Updated Contacts
        toUpdateGContacts.push(temp)
      }
    }
  }

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
  const updatedContactIds = await Contact.update(updatedContacts, credential.user, credential.brand, 'google_integration')
  const updatedGContacts  = await GoogleContact.create(toUpdateGContacts)

  await handleNewRecords(credential, createdContactIds, createdGContacts)
  await handleToUpdateRecords(credential, updatedContactIds, updatedGContacts)

  return createdGContacts.length
}


module.exports = {
  processContacts
}