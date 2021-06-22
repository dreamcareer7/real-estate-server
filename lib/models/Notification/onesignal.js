const request = require('request-promise-native')
const config = require('../../config')

/** @typedef {*} CreateNotificationOptions */
/** @typedef {*} PlayerInfo */

const onesignalRequest = request.defaults({
  baseUrl: 'https://onesignal.com/api/v1',
  json: true,
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
})

function basicAuth (token) {
  return { Authorization: `Basic ${token}` }
}

/**
 * @param {string} app
 * @param {string} playerId
 * @returns {Promise<PlayerInfo>}
 */
async function getPlayerInfo (app, playerId) {
  const onesignalConfig = config.push[app].config
  
  return onesignalRequest.get({
    uri: `/players/${playerId}`,
    qs: { app_id: onesignalConfig.appId },
    headers: basicAuth(onesignalConfig.apiKey),
  })
}

/**
 * @param {string} app
 * @param {string} playerId
 * @returns {Promise<boolean>}
 */
async function isPlayerIdValid (app, playerId) {
  const info = await getPlayerInfo(app, playerId).catch(() => null)
  return info && !info.invalid_identifier
}

/**
 * @param {string} app
 * @param {CreateNotificationOptions} options
 * @returns {Promise}
 */
async function send (app, options) {
  const onesignalConfig = config.push[app].config
  
  options.app_id || (options.app_id = onesignalConfig.appId)

  return request.post({
    uri: '/notifications',
    body: options,
    headers: basicAuth(onesignalConfig.apiKey),
  })
}

module.exports = {
  getChannelInfo: getPlayerInfo,
  isTokenValid: isPlayerIdValid,
  send,
}
