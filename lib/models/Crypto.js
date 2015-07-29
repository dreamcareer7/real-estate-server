var db = require('../utils/db.js');
var config = require('../config.js');
var crypto = require('crypto');

var algorithm = 'aes-256-ctr';
var key = crypto.createHash('sha256').update(config.crypto.pw_reset_key, 'ascii').digest();
var iv = config.crypto.pw_reset_iv;

Crypto = {};

Crypto.encrypt = function(data) {
  var cipher = crypto.createCipheriv(algorithm, key, iv)
  var crypted = cipher.update(data, 'utf8', 'base64')
  crypted += cipher.final('base64');
  return crypted;
}

Crypto.decrypt = function(data) {
  var decipher = crypto.createDecipheriv(algorithm, key, iv)
  var dec = decipher.update(data, 'base64', 'utf8')
  dec += decipher.final('utf8');
  return dec;
}

module.exports = function(){};