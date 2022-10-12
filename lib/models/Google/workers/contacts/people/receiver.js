const config = require('../../../../../config')
const { groupBy, keyBy } = require('lodash')

const ContactIntegration = require('../../../../ContactIntegration')
const GoogleContact      = require('../../../contact')
const ContactAttribute   = {
  ...require('../../../../Contact/attribute/manipulate'),
  ...require('../../../../Contact/attribute/get'),
}
const Contact = {
  ...require('../../../../Contact/get'),
  ...require('../../../../Contact/fast_filter'),
  ...require('../../../../Contact/manipulate')
}

const { parseAttributes, findNewAttributes } = require('./helpers/attributes')
const { targetKeys } = require('./helpers/constants')

const _REASON = config.google_integration.contact_update_reason



const handleNewRecords = async (googleContacts) => {
  const integrationRecords = googleContacts.map(gc => (
    {
      google_id: gc.id,
      microsoft_id: null,
      contact: gc.contact,
      origin: 'google',
      etag: gc.etag,
      local_etag: gc.etag      
    }
  ))

  await ContactIntegration.insert(integrationRecords)
}

const handleToUpdateRecords = async (googleContacts) => {
  const integrationRecords = googleContacts.map(gc => (
    {
      google_id: gc.id,
      microsoft_id: null,
      contact: gc.contact,
      origin: 'google',
      etag: gc.etag,
      local_etag: gc.etag      
    }
  ))

  await ContactIntegration.gupsert(integrationRecords)
}

const processConfirmed = async (credential, confirmed, parked) => {
  if ( confirmed.length === 0 ) {
    return 0
  }

  const credentialId = credential.id
  const brand        = credential.brand
  const user         = credential.user

  const entryIds       = confirmed.map(c => c.entry_id)
  const googleContacts = await GoogleContact.getByEntryIds(credentialId, entryIds)
  const contactGroups  = await GoogleContact.getRefinedContactGroups(credentialId)

  const oldGContactEntryIds   = googleContacts.map(c => c.entry_id)
  const oldGContactsByEntryId = keyBy(googleContacts, 'entry_id')
  
  const newRemoteContacts = confirmed.filter(c => !oldGContactEntryIds.includes(c.entry_id))
  const oldRemoteContacts = confirmed.filter(c => oldGContactEntryIds.includes(c.entry_id) && (oldGContactsByEntryId[c.entry_id].etag !== c.etag))

  const newRemoteContactEntryIds = newRemoteContacts.map(c => c.entry_id)
  const toUpdateContactIds       = oldRemoteContacts.filter(c => oldGContactsByEntryId[c.entry_id]?.contact).map(c => oldGContactsByEntryId[c.entry_id].contact)

  const toUpdateGContacts = oldRemoteContacts.map(contact => (
    {
      google_credential: credential.id,
      entry_id: contact.entry_id,
      etag: contact.etag,
      resource_id: contact.resource_id,
      resource: JSON.stringify(contact),
      parked
    }
  ))

  const newContacts = newRemoteContacts.map(contact => {
    /** @type {IContactInput} */
    const contactObj = {
      user,
      attributes: [{ attribute_type: 'source_type', text: 'Google' }],
      parked
    }
  
    for (const key in contact) {
      if (targetKeys.indexOf(key) >= 0) {
        const attributes      = parseAttributes(key, contact, contactGroups)
        contactObj.attributes = contactObj.attributes.concat(attributes)
      }
    }

    return contactObj
  })

  const createdContactIds = await Contact.create(newContacts, user, brand, _REASON, { activity: false, relax: true, get: false })

  const newGContacts = newRemoteContacts.map(contact => {
    const index = newRemoteContactEntryIds.indexOf(contact.entry_id)

    return {
      google_credential: credentialId,
      entry_id: contact.entry_id,
      etag: contact.etag,
      resource_id: contact.resource_id,
      contact: createdContactIds[index],
      resource: JSON.stringify(contact),
      parked
    }
  })

  const createdGoogleContacts = await GoogleContact.create(newGContacts)
  const updatedGoogleContacts = await GoogleContact.update(toUpdateGContacts)

  // Undelete recovered contacts
  const oldContacts = await Contact.getAll(toUpdateContactIds)
  const toRecoverContacts = oldContacts.filter(c => c.deleted_at).map(c => c.id)
  await Contact.undelete(brand, user, [], {ids: toRecoverContacts, deleted_lte: (new Date().getTime() / 1000)})

  const contactsAtts = await ContactAttribute.getForContacts(toUpdateContactIds)
  const refinedAtts  = groupBy(contactsAtts, function(entry) { return entry.contact })


  const toUpdateContacts = []

  /** @type {UUID[]} */
  const toDeleteAttributeIds = []
  
  for (const gcontact of updatedGoogleContacts) {
    const id          = gcontact.contact
    const resource    = gcontact.resource
    const oldResource = oldGContactsByEntryId[gcontact.entry_id].resource
    const { attributes, deletedAtt }  = findNewAttributes(resource, oldResource, refinedAtts[id], contactGroups)

    if (attributes.length) {
      toUpdateContacts.push({ id, attributes, parked })
    }

    toDeleteAttributeIds.push(...deletedAtt ?? [])
  }

  await ContactAttribute.delete(toDeleteAttributeIds, user, _REASON)
  await Contact.update(toUpdateContacts, credential.user, credential.brand, _REASON)

  await handleNewRecords(createdGoogleContacts)
  await handleToUpdateRecords(updatedGoogleContacts)

  return createdGoogleContacts.length + updatedGoogleContacts.length
}

const processDeleted = async (credential, deleted) => {
  if ( deleted.length === 0 ) {
    return 0
  }

  const entryIds       = deleted.map(d => d.entry_id)
  const googleContacts = await GoogleContact.getByEntryIds(credential.id, entryIds)

  const googleContactIds = googleContacts.map(gc => gc.id)
  const contactIds       = googleContacts.map(gc => gc.contact)

  const integrationRecords   = await ContactIntegration.getByGoogleIds(googleContactIds)
  const integrationRecordIds = integrationRecords.map(c => c.id)

  await GoogleContact.deleteMany(googleContactIds)
  await ContactIntegration.deleteMany(integrationRecordIds)
  await Contact.delete(contactIds, credential.user, _REASON)

  return integrationRecordIds.length
}


module.exports = {
  processConfirmed,
  processDeleted
}
