const db = require('../../utils/db.js')
const { peanar } = require('../../utils/peanar')

const handler = function({ user_id, client_id, time }, cb) {
  db.query('user/seen', [user_id, client_id, time], cb)
}

const markAsSeen = peanar.job({
  handler,
  name: 'user_last_seen',
  queue: 'user_last_seen',
  exchange: 'users_last_seen',
  max_retries: 50,
  retry_exchange: 'users_last_seen.retry',
  error_exchange: 'users_last_seen.error'
})

module.exports = {
  markAsSeen
}
