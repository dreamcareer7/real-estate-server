const { keyBy } = require('lodash')

const GoogleContact = require('../../../contact')
const ContactIntegration = require('../../../../ContactIntegration')

const Contact = {
  ...require('../../../../Contact/get'),
  ...require('../../../../Contact/fast_filter'),
  ...require('../../../../Contact/manipulate')
}

const { retrieveContacts }   = require('./helpers/contacts')
const { generateGContacts }  = require('./helpers/attributes')
const { refineConnections }  = require('./helpers/refine')
const { updatePersonFields } = require('./helpers/constants')


async function handleCreated (google, credential, contactIds) {
  if ( contactIds.length === 0 ) {
    return
  }

  const contacts = await retrieveContacts(credential, contactIds)
  const records  = generateGContacts(credential.id, contacts)
  const result   = await google.batchInsertContacts(records)
  const { confirmed } = refineConnections(result.confirmed)
  const newGContacts  = confirmed.map(c => {
    const sign = c.clientData.filter(record => (record.key === 'rechat-sign' && record.credential === credential.id)).pop()

    return {
      google_credential: credential.id,
      entry_id: c.entry_id,
      resource_id: c.resource_id,
      contact: sign.contact,
      etag: c.etag,
      resource: JSON.stringify(c),
      parked: false
    }
  })

  const createdGContacts   = await GoogleContact.create(newGContacts)
  const integrationRecords = createdGContacts.map(gcontact => {
    return {
      google_id: gcontact.id,
      microsoft_id: null,
      contact: gcontact.contact,
      origin: 'rechat',
      etag: gcontact.etag,
      local_etag: gcontact.etag
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

  const records = generateGContacts(credential.id, contacts)
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

  const googleContacts       = await GoogleContact.getByRechatContacts(credential.id, contactIds)
  const googleContactIds     = googleContacts.map(gc => gc.id)
  const integrationRecords   = await ContactIntegration.getByGoogleIds(googleContactIds)
  const integrationRecordIds = integrationRecords.map(c => c.id)

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