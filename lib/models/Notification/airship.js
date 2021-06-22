const UrbanAirshipPush = require('urban-airship-push')
const memoize = require('lodash/memoize')
const { promisify } = require('util')

const airshipConnection = require('urban-airship-push/lib/urban-airship-connection')
airshipConnection.sendRequestPromise = promisify(airshipConnection.sendRequest)

const REST_ENDPOINTS = {
  CHANNELS: '/api/channels'
}

const getAirshipClient = memoize(function getAirshipClient (airshipConfig) {
  const airship = new UrbanAirshipPush(airshipConfig)
  airship.push.sendPromise = promisify(airship.push.send)

  return airship
})

async function getChannelInfo(airshipConfig, urbanairshipDeviceToken) {
  return airshipConnection.sendRequestPromise({
    method: 'GET',
    expectedStatusCode: 200,
    auth: airshipConfig,
    path: `${REST_ENDPOINTS.CHANNELS}/${urbanairshipDeviceToken}`,
  }, null)
}

async function isTokenValid(airshipConfig, urbanairshipDeviceToken) {
  const res = await getChannelInfo(airshipConfig, urbanairshipDeviceToken)
    .catch(() => null)

  return Boolean(res?.ok && res?.channel?.opt_in)
}

async function send (airshipConfig, pushInfo) {
  return getAirshipClient(airshipConfig).push.sendPromise(pushInfo)
}

module.exports = {
  getAirshipClient,
  getChannelInfo,
  isTokenValid,
  send,
}
