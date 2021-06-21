const request = require('request-promise-native')

/** @typedef {{ apiKey: string, appId: string }} AppInfo */
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
 * @param {AppInfo} appInfo
 * @param {string} playerId
 * @returns {Promise<PlayerInfo>}
 */
async function getPlayerInfo (appInfo, playerId) {
  return onesignalRequest.get({
    uri: `/players/${playerId}`,
    qs: { app_id: appInfo.appId },
    headers: basicAuth(appInfo.apiKey),
  })
}

/**
 * @param {AppInfo} appInfo
 * @param {string} playerId
 * @returns {Promise<boolean>}
 */
async function isPlayerIdValid (appInfo, playerId) {
  const info = await getPlayerInfo(appInfo, playerId).catch(() => null)
  return info && !info.invalid_identifier
}

/**
 * @param {AppInfo} appInfo
 * @param {CreateNotificationOptions} options
 * @returns {Promise}
 */
async function send (appInfo, options) {
  options.app_id || (options.app_id = appInfo.appId)
  
  return request.post({
    uri: '/notifications',
    body: options,
    headers: basicAuth(appInfo.apiKey),
  })
}

module.exports = {
  getChannelInfo: getPlayerInfo,
  isTokenValid: isPlayerIdValid,
  send,
}
