var user = require('./user.js');

module.exports = {
  "access_token": String,
  "refresh_token": String,
  "expires_in": Number,
  "code": String,
  "data": user,
  "token_type": "Bearer"
}
