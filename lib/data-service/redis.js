const redis = require('redis')
const config = require('../config')
let connection
module.exports = {
  createConnection() {
    if (!connection) {
      connection = redis.createClient(config.redis.url)
    }
    return connection
  }
}