const rp = require('request-promise-native')
const config = require('../../config').ms_graph

function sendRequest(endPoint, accessToken) {
  return rp({
    uri: config.api_url + '/' + endPoint,
    method: 'GET',
    headers: {
      'Accept': 'Application/json',
      'Authorization': `Bearer ${accessToken}`
    }
  })
    .then(res => JSON.parse(res))
}

function getContacts(accessToken) {
  return sendRequest(config.api_endpoints.contacts, accessToken)
}

function getEvents(accessToken) {
  return sendRequest(config.api_endpoints.events, accessToken)
}

function getEmails(accessToken) {
  return sendRequest(config.api_endpoints.emails, accessToken)
}

module.exports = {
  getContacts,
  getEmails,
  getEvents
}