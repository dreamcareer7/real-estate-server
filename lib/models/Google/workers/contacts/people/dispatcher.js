const { retrieveContacts }  = require('./helpers/contacts')
const { generateGContacts } = require('./helpers/attributes')
const { refineConnections } = require('./helpers/refine')


async function handleCreated (google, credential, contactIds) {
  const contacts = await retrieveContacts(credential, ['8c5d58b6-db84-41e7-9490-59ebe7c80b92'])
  const records  = generateGContacts(contacts)
  const result   = await google.batchInsertContacts(records)
  const { confirmed } = refineConnections(result.confirmed)

  console.log('result.confirmed', result.confirmed[0])
  console.log('result.error', result.error)
  console.log('confirmed', confirmed[0])


  const newGContacts = []

  for (const contact of confirmed) {
    const temp = {
      google_credential: credential.id,
      entry_id: contact.entry_id,
      etag: contact.etag,
      resource_id: contact.resource_id,
      resource: JSON.stringify(contact),
      parked: false
    }

    newGContacts.push(temp)
  }




  const integrationRecords = []

  for (const remote of result.confirmed) {
    const contact = remote.clientData.filter(cd => cd.key === 'rechat-contact-id' ).map(cd => cd.value).pop()

    integrationRecords.push({
      google_id: remote.id,
      microsoft_id: null,
      contact,
      origin: 'rechat',
      etag: remote.etag,
      local_etag: remote.etag
    })
  }
}

async function handleUpdated (google, credential, contactIds) {
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

  // const result = await google.batchUpdateContacts(updatingArr)
  // console.log('result.confirmed', JSON.stringify(result.confirmed))
  // console.log('result.error', JSON.stringify(result.error))
}

async function handleDeleted (google, credential, contactIds) {
}


module.exports = {
  handleCreated,
  handleUpdated,
  handleDeleted
}