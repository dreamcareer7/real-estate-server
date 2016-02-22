var crypto    = require('crypto');
var redis     = require('redis');
redis.debug_mode = true;
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
      uuid: true,
      type: 'string'
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
  validate(options, function (err) {
    if (err)
      return cb(err);

    var token = JSON.parse(JSON.stringify(options));
    token.token = new Buffer(uuid.v1()).toString('base64');

    redisClient.hmset(token.token, token, (err) => {
      if(err)
        return cb(err);

      if (token.type != 'refresh') {
        redisClient.expire(token.token, config.auth.access_token_lifetime, (err) => {
          if(err)
            return cb(err);

          return cb(null, token);
        });
      } else {
        return cb(null, token);
      }
    });
  });
};

Token.get = function (token, cb) {
  console.log('Getting token', token, 'Redis queue size', redisClient.command_queue.length, redisClient.offline_queue.length);
  redisClient.hgetall(token, (err, res) => {
    console.log('Got token', token, err, res);
    cb(err, res);
  });
};


module.exports = function () {};
