const queue = require('../utils/queue.js')

Socket = {}

Socket.send = function (event, room, args, cb) {
  console.log('Socket.send() called', room, args[0].type, cb)
  const domain = process.domain

  const job = queue.create('socket_emit', {room, event, args}).ttl(100).removeOnComplete(true)

  job.on('complete', results => {
    console.log('Socket job completed', results, room, args[0].type, cb)
    if (!cb)
      return
    domain.enter()
    cb(null, results)
  })

  job.on('failed', (err) => {
    console.log('Socket job failed', err, room, args[0].type, cb)
    domain.enter()
    if (cb)
      return cb(err)

    job.remove()
  })

  job.save(err => {
    console.log('Saving response', err)
  })
}

Socket.join = function (user_id, room_id) {
  const job = queue.create('socket_join', {user_id, room_id}).ttl(100).removeOnComplete(true)
  job.save()
}
