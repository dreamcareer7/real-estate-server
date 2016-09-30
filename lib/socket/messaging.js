const async = require('async')

const io = SocketServer.io

function postMessage (sock, room_id, message, cb) {
  if (!sock.user)
    return cb(Error.Unauthorized('Authentication required'))

  message.author = sock.user.id

  Room.get(room_id, function (err, room) {
    if (err)
      return cb(err)

    Message.post(room_id, message, true, function (err, message) {
      if (err)
        return cb(err)

      Orm.populate(message, {}, cb)
    })
  })
}

function typing (room_id, cb) {
  const socket = this
  if (!socket.user) {
    if (cb)
      cb(Error.Unauthorized('Authentication required'))
    return
  }

  io.to(room_id).emit('User.Typing', {
    user_id: socket.user.id,
    room_id: room_id
  })
}

function typingEnded (room_id, cb) {
  const socket = this
  if (!socket.user) {
    if (cb)
      cb(Error.Unauthorized('Authentication required'))

    return
  }

  io.to(room_id).emit('User.TypingEnded', {
    user_id: socket.user.id,
    room_id: room_id
  })
}

function replayRoom (sock, from, room, cb) {
  Message.retrieve(room.id, {
    type: 'Since_C',
    timestamp: from,
    limit: 1000,
    reference: 'None',
    recommendation: 'None'
  }, (err, messages) => {
    if (err)
      return cb(err)

    messages.forEach(m => io.to(room.id).emit('Message.Sent', room, m))
    cb()
  })
}

function replay (sock, from, cb) {
  if (!sock.user)
    return

  async.each(sock.user.rooms, (room, cb) => replayRoom(sock, from, room, cb), cb)
}

io.use((socket, next) => {
  const post = SocketServer.transaction(postMessage, socket)

  const queueMessage = (room_id, message, cb) => {
    socket.message_queue.push({
      message, room_id
    }, cb)
  }

  function handleMessage (payload, cb) {
    post(payload.room_id, payload.message, cb)
  }

  SocketServer.transaction(postMessage, socket)

  socket.message_queue = async.queue(handleMessage, 1)

  socket.on('Message.Send', queueMessage)
  socket.on('User.Typing', typing)
  socket.on('User.TypingEnded', typingEnded)
  socket.on('Replay', SocketServer.transaction(replay, socket))
  next()
})
