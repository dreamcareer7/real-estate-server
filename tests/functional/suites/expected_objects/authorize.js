const user = require('./user.js')
const v = require('./validation.js')

const refresh = {
  'access_token': v.optionalString,
  'refresh_token': String,
  'expires_in': Number,
  'code': String,
  'token_type': String
}

const access = JSON.parse(JSON.stringify(refresh))
access.data = user

module.exports = {access, refresh}