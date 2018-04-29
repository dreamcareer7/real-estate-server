const airshipConfig = require('../config.js').airship
const airshipConnection = require('urban-airship-push/lib/urban-airship-connection')

const REST_ENDPOINTS = {
  CHANNELS: '/api/channels'
}

const options = {
  method: 'GET',
  expectedStatusCode: 200,
  auth: airshipConfig
}

const getChannelInfo = async function (urbanairshipDeviceToken) {
  options.path = `${REST_ENDPOINTS.CHANNELS}/${urbanairshipDeviceToken}`
  return new Promise((resolve, reject) => {
    airshipConnection.sendRequest(options, null, (err, res) => {
      if (err) {
        reject(err)
      }
      resolve(res)
    })
  })
}

module.exports = getChannelInfo