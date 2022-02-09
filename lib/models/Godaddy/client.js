const config = require('../../config.js')

const godaddy = process.env.NODE_ENV === 'tests' ? require('./mock') : require('godaddy')({
  host: config.godaddy.host || undefined,
  client_id: config.godaddy.key,
  client_secret: config.godaddy.secret
})

module.exports = godaddy
