const redis = require('redis')
const async = require('async')
const _u = require('underscore')
const uuid = require('node-uuid')
const validator = require('../utils/validator.js')
const config = require('../config.js')
const db = require('../utils/db.js')

Token = {}

const schema = {
  type: 'object',
  properties: {
    client_id: {
      required: true,
      type: 'string',
      uuid: true
    },

    user: {
      required: true,
      type: 'string',
      uuid: true
    },

    token_type: {
      required: true,
      type: 'string'
    }
  }
}

const redisClient = redis.createClient(config.redis)

const validate = validator.promise.bind(null, schema)

Token.create = async token => {
  await validate(token)

  const result = await db.query.promise('token/insert', [
    token.client_id,
    token.user,
    token.token_type,
    token.expires_at
  ])

  return Token.get(result.rows[0].token)
}

Token.get = async token => {
  const res = await db.query.promise('token/get', [token])

  if (res.rows.length < 1)
    throw Error.ResourceNotFound(`Token ${token} not found`)

  return res.rows[0]
}