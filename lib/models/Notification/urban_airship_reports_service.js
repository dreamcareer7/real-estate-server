const airshipConfig = require('../../config.js').airship
const airshipConnection = require('urban-airship-push/lib/urban-airship-connection')
const _ = require('lodash')
const promisify = require('util').promisify

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
  const finalRes = _.get(result, 'ok', false) && _.get(result, 'channel.installed', false)
  return finalRes
}

module.exports = {
  getChannelInfo,
  isTokenValid
}