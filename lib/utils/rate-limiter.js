const { rateLimit } = require('express-rate-limit')
const promisify = require('./promisify')
const RedisStore = require('rate-limit-redis').default

const redis = require('../data-service/redis').createClient()
const sendCommand = promisify(redis.sendCommand.bind(redis))

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers,

  // Redis store configuration
  store: new RedisStore({
    sendCommand(command, ...args) {
      return sendCommand(command, args)
    }
  }),
})

module.exports = limiter
