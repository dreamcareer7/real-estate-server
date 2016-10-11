const queue = require('../utils/queue.js')

Socket = {}

Socket.send = function (event, room, args, cb) {
  const domain = process.domain

  const job = queue.create('socket_emit', {room, event, args}).ttl(100).removeOnComplete(true)

  if (cb) {
    job.on('complete', results => {
      domain.enter()
      cb(null, results)
    })
  }

  job.on('failed', (err) => {
    domain.enter()
    if (cb)
      return cb(err)

    job.remove()
  })

  job.save()
}

Socket.join = function (user_id, room_id) {
  const job = queue.create('socket_join', {user_id, room_id}).ttl(100).removeOnComplete(true)
  job.save()
}
