const redis = require('redis')
const async = require('async')
const _u = require('underscore')
const uuid = require('node-uuid')
const validator = require('../utils/validator.js')
const config = require('../config.js')

Token = {}

const schema = {
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
}

const redisClient = redis.createClient(config.redis)

const validate = validator.bind(null, schema)

Token.create = function (options, cb) {
  const token = _u.clone(options)
  token.token = new Buffer(uuid.v1()).toString('base64')

  async.auto({
    validate: cb => {
      validate(options, cb)
    },
    set: [
      'validate',
      cb => {
        return redisClient.hmset(token.token, token, cb)
      }
    ],
    refresh_set: [
      'validate',
      'set',
      cb => {
        if (token.type == 'refresh')
          return cb()

        return redisClient.expire(token.token, config.auth.access_token_lifetime, cb)
      }
    ]
  }, (err, results) => {
    if (err)
      return cb(err)

    return cb(null, token)
  })
}

Token.get = function (token, cb) {
  redisClient.hgetall(token, cb)
}

// FIXME
// Token.get sometimes times out.
// It happens in the hgetall call to redis.
// We dont know why it happens.
// This hack prevents that.

setInterval(() => {
  redisClient.hgetall('foo', () => {})
}, 1000)

module.exports = function () {}
