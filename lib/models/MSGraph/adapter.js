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

function getContacts(accessToken, props) {
  return sendRequest(config.api_endpoints.contacts + getPropsAsUrlSuffix(props), accessToken)
}

function getEvents(accessToken, props) {
  return sendRequest(config.api_endpoints.events + getPropsAsUrlSuffix(props), accessToken)
}

function getEmails(accessToken, props) {
  return sendRequest(config.api_endpoints.emails + getPropsAsUrlSuffix(props), accessToken)
}

function getPropsAsUrlSuffix(props) {
  const beginningOfPropsInUrl = '?$select='
  if (props) {
    return beginningOfPropsInUrl + props.join(',')
  }
  return ''
}

module.exports = {
  getContacts,
  getEmails,
  getEvents
}