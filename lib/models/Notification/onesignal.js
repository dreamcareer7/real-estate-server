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

if (process.env.NODE_ENV === 'tests') {
  module.exports = {
    getChannelInfo: async function mockGetChannelInfo (app, playerId) {
      return {
        identifier: 'a'.repeat(64),
        session_count: 1,
        language: 'en',
        timezone: -28800,
        game_version: '1.0',
        device_os: '1.0.0',
        device_type: 0,
        device_model: 'iPhone',
        ad_id: null,
        tags: { foo: 'bar', baz: 'qux' },
        last_active: Date.UTC(2021) / 1000,
        amount_spent: 0.0,
        created_at: Date.UTC(2020) / 1000,
        invalid_identifier: false,
        badge_count: 0,
        external_user_id: null,
      }
    },

    isTokenValid: async function mockIsPlayerIdValid (app, playerId) {
      return true
    },

    send: async function mockSend (app, options) {
      return {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        recipients: 1,
        external_id: null,
      }
    },
  }
}
