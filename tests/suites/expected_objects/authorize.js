var user = require('./user.js');
var v = require('../../../lib/utils/response_validation.js');

module.exports = {
  "access_token": v.optionalString,
  "refresh_token": String,
  "expires_in": Number,
  "code": String,
  "data": user,
  "token_type": "Bearer"
}
