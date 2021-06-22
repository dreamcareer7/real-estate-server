const airshipConnection = require('urban-airship-push/lib/urban-airship-connection')
const promisify = require('util').promisify
const UrbanAirshipPush = require('urban-airship-push')

const REST_ENDPOINTS = {
  CHANNELS: '/api/channels'
}

const getAirshipClient = memoize(function getAirshipClient (config) {
  const airship = new UrbanAirshipPush(airshipConfig)
  airship.push.sendPromise = promisify(airship.push.send)

  return airship
})

async function getChannelInfo(airshipConfig, urbanairshipDeviceToken) {
  /* TODO: Remove this: */
  if (arguments.length === 1) {
    urbanairshipDeviceToken = airshipConfig
    airshipConfig = require('../../config.js').push.rechat.config
  }
  
  const options = {
    method: 'GET',
    expectedStatusCode: 200,
    auth: airshipConfig,
    path: `${REST_ENDPOINTS.CHANNELS}/${urbanairshipDeviceToken}`,
  }
  
  return promisify(airshipConnection.sendRequest)(options, null)
}

async function isTokenValid(airshipConfig, urbanairshipDeviceToken) {
  const res = await getChannelInfo(airshipConfig, urbanairshipDeviceToken)
        .catch(() => null)

  return Boolean(res?.ok && res?.channel?.opt_in)
}

async function send (airshipConfig, pushInfo) {
  /* TODO: Remove this: */
  if (arguments.length === 1) {
    pushInfo = airshipConfig
    airshipConfig = require('../../config.js').push.rechat.config
  }
  
  return getAirshipClient(airshipConfig).push.sendPromise(pushInfo)
}

module.exports = {
  getAirshipClient,
  getChannelInfo,
  isTokenValid,
  send,
}
