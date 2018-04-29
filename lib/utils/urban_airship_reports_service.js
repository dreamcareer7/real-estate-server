const airshipConfig = require('../config.js').airship
const airshipConnection = require('urban-airship-push/lib/urban-airship-connection')
const _ = require('lodash')

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
  return new Promise((resolve, reject) => {
    airshipConnection.sendRequest(options, null, (err, res) => {
      if (err) {
        reject(err)
      }
      resolve(res)
    })
  })
}

async function isTokenValid(urbanairshipDeviceToken, cb = function(...a){}) {
  let result
  try {
    result = await getChannelInfo(urbanairshipDeviceToken)
  } catch(err) {
    cb(err)
    return false
  }
  const finalRes = _.get(result, 'ok', false) && _.get(result, 'channel.installed', false)
  cb(null, finalRes)
  return finalRes
}

module.exports = {
  getChannelInfo,
  isTokenValid
}