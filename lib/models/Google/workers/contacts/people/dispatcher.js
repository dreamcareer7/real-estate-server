const { keyBy } = require('lodash')

const GoogleContact = require('../../../contact')
const ContactIntegration = require('../../../../ContactIntegration')

const Contact = {
  ...require('../../../../Contact/get'),
  ...require('../../../../Contact/fast_filter'),
  ...require('../../../../Contact/manipulate')
}

const { retrieveContacts }  = require('./helpers/contacts')
const { generateGContacts } = require('./helpers/attributes')
const { refineConnections } = require('./helpers/refine')

const updatePersonFields = 'names,nicknames,birthdays,urls,addresses,emailAddresses,phoneNumbers,biographies,organizations'


async function handleCreated (google, credential, contactIds) {
  if ( contactIds.length === 0 ) {
    return
  }

  const contacts = await retrieveContacts(credential, contactIds)
  const records  = generateGContacts(contacts)
  const result   = await google.batchInsertContacts(records)
  const { confirmed } = refineConnections(result.confirmed)

  const newGContacts = confirmed.map(c => {
    return {
      google_credential: credential.id,
      entry_id: c.entry_id,
      etag: c.etag,
      resource_id: c.resource_id,
      resource: JSON.stringify(c),
      parked: false
    }
  })

  const createdGContacts = await GoogleContact.create(newGContacts)
  const googleContactsByResourceId = keyBy(createdGContacts, 'resource_id')

  const integrationRecords = result.confirmed.map(remote => {
    const contact = remote.clientData.filter(cd => cd.key === 'rechat-contact-id' ).map(cd => cd.value).pop()
    const resource_id = remote.resourceName.split('/')[1]

    return {
      google_id: googleContactsByResourceId[resource_id].id,
      microsoft_id: null,
      contact,
      origin: 'rechat',
      etag: remote.etag,
      local_etag: remote.etag
    }
  })

  return await ContactIntegration.insert(integrationRecords)
}

async function handleUpdated (google, credential, contactIds) {
  if ( contactIds.length === 0 ) {
    return
  }

  const integrationRecords = await ContactIntegration.getByContacts(contactIds)
  const googleContactIds   = integrationRecords.map(c => c.google_id)
  const googleContacts     = await GoogleContact.getAll(googleContactIds)
  const googleContactsById = keyBy(googleContacts, 'id')

  const contacts = await retrieveContacts(credential, contactIds)
  const contactsByGoogleId = keyBy(contacts, 'google_id')

  const records = generateGContacts(contacts)
  const refined = records.map(record => {
    record.resource.etag = googleContactsById[record.gcontactId].etag

    return {
      resourceId: googleContactsById[record.gcontactId].resource_id,
      updatePersonFields,
      ...record
    }
  })

  const result = await google.batchUpdateContacts(refined)
  const { confirmed } = refineConnections(result.confirmed)

  const toUpdateGContacts = confirmed.map(c => {
    return {
      google_credential: credential.id,
      entry_id: c.entry_id,
      etag: c.etag,
      resource_id: c.resource_id,
      resource: JSON.stringify(c),
      parked: false
    }
  })


  const updatedGContacts   = await GoogleContact.create(toUpdateGContacts)
  const toUpdateIntRecords = updatedGContacts.map(ugc => {
    return {
      google_id: ugc.id,
      etag: ugc.etag,
      local_etag: ugc.etag,
      contact: contactsByGoogleId[ugc.id].id
    }
  })

  return await ContactIntegration.gupsert(toUpdateIntRecords)
}

async function handleDeleted (google, credential, contactIds) {
  if ( contactIds.length === 0 ) {
    return
  }

  const integrationRecords   = await ContactIntegration.getByContacts(contactIds)
  const integrationRecordIds = integrationRecords.map(c => c.id)
  const googleContactIds     = integrationRecords.map(c => c.google_id)
  const googleContacts       = await GoogleContact.getAll(googleContactIds)

  const deletionArr = googleContacts.map(record => record.resource_id)

  await google.batchDeleteContacts(deletionArr)
  await GoogleContact.deleteMany(googleContactIds)
  await ContactIntegration.deleteMany(integrationRecordIds)
  await Contact.delete(contactIds, credential.user, 'google_integration')
}


module.exports = {
  handleCreated,
  handleUpdated,
  handleDeleted
}