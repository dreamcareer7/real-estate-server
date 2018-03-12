const rp = require('request-promise-native')
const config = require('../../config').ms_graph
const _ = require('lodash')

const NUM_OF_ENTITIES_TO_GET = 1000

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

async function getAllContacts(accessToken, props) {
  const promises = []
  const NUM_OF_LOOPS = 15
  for (let i = 0; i < NUM_OF_LOOPS; i++) {
    promises.push(getContacts(accessToken, props,
      toQueryParams(
        {
          '$skip': i * NUM_OF_ENTITIES_TO_GET,
          '$top': NUM_OF_ENTITIES_TO_GET
        }
      )))
  }
  const allRes = await Promise.all(promises)
  const res = allRes.reduce((p, c) => ({value: _.concat(p.value, c.value)}), {value: []})
  return res
}


function getContacts(accessToken, props, options) {
  return sendRequest(config.api_endpoints.contacts + getPropsAsUrlSuffix(props) + '&' + options, accessToken)
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

function toQueryParams(options) {
  const stringVals = []
  for (const key of Object.keys(options)) {
    stringVals.push(`${key}=${options[key]}`)
  }
  return stringVals.join('&')
}

module.exports = {
  getContacts,
  getEmails,
  getEvents,
  getAllContacts
}