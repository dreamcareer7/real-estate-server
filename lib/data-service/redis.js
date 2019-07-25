const redis = require('redis')
const config = require('../config')
let connection
module.exports = {
  createClient() {
    if (!connection) {
      connection = redis.createClient(config.redis.url)
    }
    return connection
  }
}

process.on('SIGTERM', () => connection.quit())
process.on('SIGINT', () => connection.quit())
