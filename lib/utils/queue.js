const kue = require('kue')
const config = require('../config.js')
const redis = require('redis')

const q = kue.createQueue({
  redis: {
    createClientFactory: function () {
      return redis.createClient(config.redis)
    }
  }
})

q.watchStuckJobs(5000)

module.exports = q
