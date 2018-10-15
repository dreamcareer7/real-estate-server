const queue = require('../utils/queue.js')

const Socket = {}

Socket.send = function (event, room, args, cb) {
  const context = Context.getActive()

  const job = queue.create('socket_emit', {room, event, args}).ttl(500).removeOnComplete(true)

  job.on('complete', results => {
    if (!cb)
      return
    context.enter()
    cb(null, results)
  })

  job.on('failed', (err) => {
    context.enter()
    if (cb)
      return cb(err)

    job.remove()
  })

  job.save(err => {
    if (err)
      console.log('Error while saving job', err)
  })
}

Socket.join = function (user, room_id) {
  const job = queue.create('socket_join', {user, room_id}).ttl(100).removeOnComplete(true)
  job.save()
}

global['Socket'] = Socket
module.exports = Socket
