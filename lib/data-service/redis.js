const redis = require('redis')
const config = require('../config')
let connection
module.exports = {
  createClient() {
    if (!connection) {
      connection = redis.createClient(config.redis.url)
    }
    return connection
  },

  shutdown() {
    if (connection) {
      connection.quit()
      connection = undefined
    }
  }
}

process.on('SIGTERM', module.exports.shutdown)
process.on('SIGINT', module.exports.shutdown)
