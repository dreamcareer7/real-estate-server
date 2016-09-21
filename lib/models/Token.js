var crypto    = require('crypto');
var redis     = require('redis');
var async     = require('async');
var _u        = require('underscore');
var uuid      = require('node-uuid');
var db        = require('../utils/db.js');
var validator = require('../utils/validator.js');
var sql       = require('../utils/require_sql.js');
var config    = require('../config.js');

Token = {};

var schema = {
  type: 'object',
  properties: {
    client_id: {
      required: true,
      type: 'string',
      uuid: true
    },

    user_id: {
      required: true,
      type: 'string',
      uuid: true
    },

    type: {
      required: true,
      type: 'string'
    },

    expire_date: {
      type: 'number'
    }
  }
};

var redisClient = redis.createClient(config.redis);

var validate = validator.bind(null, schema);

Token.create = function (options, cb) {
  var token = _u.clone(options);
  token.token = new Buffer(uuid.v1()).toString('base64');

  async.auto({
    validate: cb => {
      validate(options, cb);
    },
    set: [
      'validate',
      cb => {
        return redisClient.hmset(token.token, token, cb);
      }
    ],
    refresh_set: [
      'validate',
      'set',
      cb => {
        if(token.type == 'refresh')
          return cb();

        return redisClient.expire(token.token, config.auth.access_token_lifetime, cb);
      }
    ],
    reverse_persist: [
      'validate',
      'set',
      cb => {
        var key = token.type + ':' + token.user_id;
        return redisClient.set(key, token.token, cb);
      }
    ]
  }, (err, results) => {
    if(err)
      return cb(err);

    return cb(null, token);
  });
};

Token.get = function (token, cb) {
  redisClient.hgetall(token, cb);
};

Token.getOrCreateForUser = function(type, user_id, cb) {
  var key = type + ':' + user_id;

  redisClient.get(key, (err, token) => {
    if(err)
      return cb(err);

    if(token) {
      return cb(null, token);
    } else {
      var options = {
        user_id: user_id,
        type: type,
        client_id: config.tests.client_id
      };

      Token.create(options, (err, token) => {
        if(err)
          return cb(err);

        return cb(null, token.token);
      });
    }
  });
};

// FIXME
// Token.get sometimes times out.
// It happens in the hgetall call to redis.
// We dont know why it happens.
// This hack prevents that.

setInterval(() => {
  redisClient.hgetall('foo', () => {});
}, 1000);

module.exports = function () {};
