const airshipConfig = require('../../config.js').push.rechat.config
const airshipConnection = require('urban-airship-push/lib/urban-airship-connection')
const _ = require('lodash')
const promisify = require('util').promisify
const config = require('../../config.js')
const UrbanAirshipPush = require('urban-airship-push')

const airship = new UrbanAirshipPush(config.airship)
airship.push.sendPromise = promisify(airship.push.send)

const REST_ENDPOINTS = {
  CHANNELS: '/api/channels'
}

const options = {
  method: 'GET',
  expectedStatusCode: 200,
  auth: airshipConfig
}

async function getChannelInfo(urbanairshipDeviceToken) {
  options.path = `${REST_ENDPOINTS.CHANNELS}/${urbanairshipDeviceToken}`
  return promisify(airshipConnection.sendRequest)(options, null)
}

async function isTokenValid(urbanairshipDeviceToken) {
  let result
  try {
    result = await getChannelInfo(urbanairshipDeviceToken)
  } catch(err) {
    return false
  }
  const finalRes = _.get(result, 'ok', false) && _.get(result, 'channel.opt_in', false)
  return finalRes
}

async function send (pushInfo) {
  return airship.push.sendPromise(pushInfo)
}

module.exports = {
  getChannelInfo,
  isTokenValid,
  send,
}
