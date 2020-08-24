const db = require('../../utils/db.js')
const queue = require('../../utils/queue.js')

const markAsSeen = function(user_id, client_id) {
  const job = queue
    .create('save_last_seen', {
      user_id,
      client_id,
      time: new Date()
    })
    .removeOnComplete(true)

  job.save()
}

const saveLastSeen = function({ user_id, client_id, time }, cb) {
  db.query('user/seen', [user_id, client_id, time], cb)
}

module.exports = {
  markAsSeen,
  saveLastSeen
}
