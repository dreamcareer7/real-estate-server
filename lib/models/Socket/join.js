const queue   = require('../../utils/queue.js')

const mock = () => {}

const join = function (user, room_id) {
  const job = queue.create('socket_join', {user, room_id}).ttl(100).removeOnComplete(true)
  job.save()
}

const isTest = process.env.NODE_ENV === 'tests'

module.exports = {
  join: isTest ? mock : join
}
