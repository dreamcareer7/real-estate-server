const airshipConnection = require('urban-airship-push/lib/urban-airship-connection')
const promisify = require('util').promisify
const config = require('../../config.js')
const UrbanAirshipPush = require('urban-airship-push')

const airship = new UrbanAirshipPush(config.airship)
airship.push.sendPromise = promisify(airship.push.send)

const REST_ENDPOINTS = {
  CHANNELS: '/api/channels'
}

async function getChannelInfo(airshipConfig, urbanairshipDeviceToken) {
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

async function send (pushInfo) {
  return airship.push.sendPromise(pushInfo)
}

module.exports = {
  getChannelInfo,
  isTokenValid,
  send,
}
