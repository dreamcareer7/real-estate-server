var config = require('../config.js');
var crypto = require('crypto'),
    algorithm = 'aes-256-ctr',
    password = config.crypto.pw_reset_secret;

Crypto = {};

Crypto.encrypt = function(data) {
  var cipher = crypto.createCipher(algorithm, password)
  var crypted = cipher.update(data, 'utf8', 'base64')
  crypted += cipher.final('base64');
  return crypted;
}

Crypto.decrypt = function(data) {
  var decipher = crypto.createDecipher(algorithm, password)
  var dec = decipher.update(data, 'base64', 'utf8')
  dec += decipher.final('utf8');
  return dec;
}