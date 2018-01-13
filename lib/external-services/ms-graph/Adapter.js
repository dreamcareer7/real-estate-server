const rp = require('request-promise-native')

function Adapter(msOptions) {
  const options = msOptions

  function sendRequest(endPoint) {
    return rp({
      uri: options.baseURI + '/' + endPoint,
      method: 'GET',
      headers: {
        'Accept': 'Application/json',
        'Authorization': `Bearer ${options.clientData.accessToken}`
      }
    })
      .then(res => JSON.parse(res))
  }

  this.getContacts = function () {
    return sendRequest(options.apiEndpoints.contacts)
  }

  this.getEvents = function () {
    return sendRequest(options.apiEndpoints.events)
  }

  this.getEmails = function () {
    return sendRequest(options.apiEndpoints.emails)
  }
}

module.exports = Adapter