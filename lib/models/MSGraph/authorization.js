const request = require('request-promise-native')
const config = require('../../config').ms_graph
const lo = require('lodash')

const AUTH_BASE_URL = config.authorization_url
const CLIENT_ID = config.client_id
const CLIENT_SECRET = config.client_secret
const REDIRECT_URL = config.redirect_url
const GRANT_TYPE_AUTHORIZATION = 'authorization_code'
const GRANT_TYPE_REFRESH_TOKEN = 'refresh_token'

const BASE_AUTH_DATA = {
  'client_id': CLIENT_ID,
  'client_secret': CLIENT_SECRET,
  'redirect_url': REDIRECT_URL
}

function sendRequest(data, grantType) {
  const additionalProperty = grantType === GRANT_TYPE_AUTHORIZATION ?
    {'code': data} :
    {'refresh_token': data}
  additionalProperty['grant_type'] = grantType

  // We are returning a new promise to be able to handle error situation using parsing and sending response.body
  // if we just returned request.post, that was not possible and errors went to then as well
  return new Promise((resolve, reject) => {
    request.post(AUTH_BASE_URL)
      .form(lo.assign(BASE_AUTH_DATA, additionalProperty))
      .then(x => {
        resolve(JSON.parse(x))
      })
      .catch(e => reject(JSON.parse(e.response.body)))
  })
}

/***
 * authorize does the authorization for the first time and returns all response data
 * @param {string} userCode - The code given to server after user authenticated with Microsoft
 * @returns {object} An object containing all info. returned by MS
 */
function authorize(userCode) {
  return sendRequest(userCode, GRANT_TYPE_AUTHORIZATION)
}

function renewAccessToken(refreshToken) {
  return sendRequest(refreshToken, GRANT_TYPE_REFRESH_TOKEN)
}

function getAccessTokenByCode(code) {
  return authorize(code)
    .then(x => x.access_token)
}

function getAccessTokenByRefreshToken(refreshToken) {
  return renewAccessToken(refreshToken)
    .then(x => x.access_token)
}

module.exports = {
  authorize,
  renewAccessToken,
  getAccessTokenByCode,
  getAccessTokenByRefreshToken
}