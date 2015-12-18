var user = require('./user.js');

module.exports = {
  "access_token": function(val) { expect(val).toBeTypeOrNull(String); },
  "refresh_token": String,
  "expires_in": Number,
  "code": String,
  "data": user,
  "token_type": "Bearer"
}
