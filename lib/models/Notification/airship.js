const UrbanAirshipPush = require('urban-airship-push')
const { promisify } = require('util')
const config = require('../../config')

const airshipConnection = require('urban-airship-push/lib/urban-airship-connection')
airshipConnection.sendRequestPromise = promisify(airshipConnection.sendRequest)

const REST_ENDPOINTS = {
  CHANNELS: '/api/channels'
}

function createClient (app) {
  const client = new UrbanAirshipPush(config.push[app].config)
  client.push.sendPromise = promisify(client.push.send)
  return client
}

const airshipClients = {
  rechat: createClient('rechat'),
}

async function getChannelInfo(app, urbanairshipDeviceToken) {
  const airshipConfig = config.push[app].config
  return airshipConnection.sendRequestPromise({
    method: 'GET',
    expectedStatusCode: 200,
    auth: airshipConfig,
    path: `${REST_ENDPOINTS.CHANNELS}/${urbanairshipDeviceToken}`,
  }, null)
}

async function isTokenValid(app, urbanairshipDeviceToken) {
  const res = await getChannelInfo(app, urbanairshipDeviceToken)
    .catch(() => null)

  return Boolean(res?.ok && res?.channel?.opt_in)
}

async function send (app, pushInfo) {
  return airshipClients[app].push.sendPromise(pushInfo)
}

module.exports = {
  getChannelInfo,
  isTokenValid,
  send,
}
