const { generateGContacts } = require('./helpers/attributes')
const { retrieveContacts }  = require('./helpers/contacts')


async function handleCreated (google, credential, contactIds) {
  const contacts = await retrieveContacts(credential, ['8c5d58b6-db84-41e7-9490-59ebe7c80b92'])
  const records  = generateGContacts(contacts)
  const result   = await google.batchInsertContacts(records)

  console.log('result.confirmed', result.confirmed)
  console.log('result.error', result.error)
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