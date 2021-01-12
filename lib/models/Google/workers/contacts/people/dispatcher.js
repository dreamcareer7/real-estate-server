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


async function handleCreated (google, credential, contactIds) {
  if ( contactIds.length === 0 ) {
    return
  }

  const contacts = await retrieveContacts(credential, contactIds)
  const records  = generateGContacts(contacts)
  const result   = await google.batchInsertContacts(records)
  const { confirmed } = refineConnections(result.confirmed)

  console.log('result.confirmed', result.confirmed.length)
  console.log('result.error', result.error.length)
  console.log('confirmed', confirmed.length)

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
  const oldGContactsByResourceId = keyBy(createdGContacts, 'resource_id')

  const integrationRecords = result.confirmed.map(remote => {
    const contact = remote.clientData.filter(cd => cd.key === 'rechat-contact-id' ).map(cd => cd.value).pop()
    const resource_id = remote.resourceName.split('/')[1]

    return {
      google_id: oldGContactsByResourceId[resource_id].id,
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

  const updatingArr = [{
    'resource_id': 'people/c1504706431892127783',
    'updatePersonFields': 'names',
    'resource': {
      'etag': '%EigBAj0DBAUGBwgJPgoLPwwNDg8QQBESExQVFhc1GTQ3HyEiIyQlJicuGgQBAgUHIgxkeHdvTWdaWnBYbz0=',
      'names': [
        {
          'givenName': 'by-api-givenName'
        }
      ]
    }
  }]

  // const result = await google.batchUpdateContacts(updatingArr)
  // console.log('result.confirmed', JSON.stringify(result.confirmed))
  // console.log('result.error', JSON.stringify(result.error))
}

async function handleDeleted (google, credential, contactIds) {
  if ( contactIds.length === 0 ) {
    return
  }

  const integrationRecords   = await ContactIntegration.getByContacts(contactIds)
  const integrationRecordIds = integrationRecords.map(c => c.id)
  const googleContactIds     = integrationRecords.map(c => c.google_id)
  const googleContacts       = await GoogleContact.getAll(googleContactIds)

  const deletionArr = googleContacts.map(record => `people/${record.resource_id}`)

  console.log('---- handleDeleted deletionArr', deletionArr)

  const result = await google.batchDeleteContacts(deletionArr)
  console.log('--- handleDeleted result.confirmed', JSON.stringify(result.confirmed))
  console.log('--- handleDeleted result.error', JSON.stringify(result.error))

  await GoogleContact.deleteMany(googleContactIds)
  await ContactIntegration.deleteMany(integrationRecordIds)
  await Contact.delete(contactIds, credential.user, 'google_integration')
}


module.exports = {
  handleCreated,
  handleUpdated,
  handleDeleted
}