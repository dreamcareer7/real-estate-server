const { keyBy } = require('lodash')

const config  = require('../../../../../config')
const Context = require('../../../../Context')

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

const _REASON = config.google_integration.contact_update_reason


async function handleCreated (google, credential, contactIds) {
  if ( contactIds.length === 0 ) {
    return
  }

  Context.log('SyncGoogleContacts - handleCreated - contactIds.length', contactIds.length)

  const contacts = await retrieveContacts(contactIds)
  const records  = generateGContacts(credential.id, contacts)
  const result   = await google.batchInsertContacts(records)
  const { confirmed } = refineConnections(result.confirmed)
  const newGContacts  = confirmed.map(c => {
    const key     = `rechatCredential:${credential.id}`
    const sign    = c.clientData.filter(record => record.key === key).pop()
    const contact = sign.value.split(':')[1]

    return {
      google_credential: credential.id,
      entry_id: c.entry_id,
      resource_id: c.resource_id,
      contact,
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

  Context.log('SyncGoogleContacts - handleUpdated - contactIds.length', contactIds.length)

  const googleContacts     = await GoogleContact.getByRechatContacts(credential.id, contactIds)
  const gContactsByContact = keyBy(googleContacts, 'contact')

  const contacts = await retrieveContacts(contactIds)
  const records  = generateGContacts(credential.id, contacts)
  const refined  = records.map(record => {
    record.resource.etag = gContactsByContact[record.contact].etag

    return {
      resourceId: gContactsByContact[record.contact].resource_id,
      updatePersonFields,
      ...record
    }
  })

  const result        = await google.batchUpdateContacts(refined)
  const { confirmed } = refineConnections(result.confirmed)

  const toUpdateGContacts = confirmed.map(c => {
    return {
      google_credential: credential.id,
      entry_id: c.entry_id,
      resource_id: c.resource_id,
      etag: c.etag,
      resource: JSON.stringify(c),
      parked: false
    }
  })

  const updatedGContacts   = await GoogleContact.update(toUpdateGContacts)
  const toUpdateIntRecords = updatedGContacts.map(ugc => {
    return {
      google_id: ugc.id,
      contact: ugc.contact,
      etag: ugc.etag,
      local_etag: ugc.etag
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

  await GoogleContact.deleteMany(googleContactIds)
  await ContactIntegration.deleteMany(integrationRecordIds)
  await Contact.delete(contactIds, credential.user, _REASON)
  await google.batchDeleteContacts(deletionArr)
}


module.exports = {
  handleCreated,
  handleUpdated,
  handleDeleted
}