const async = require('async')

const io = SocketServer.io

function postMessage (sock, room_id, message, push, cb) {
  if (!sock.user)
    return cb(Error.Unauthorized('Authentication required'))

  message.author = sock.user.id

  Room.get(room_id, function (err, room) {
    if (err)
      return cb(err)

    Message.post(room_id, message, push, function (err, message) {
      if (err)
        return cb(err)

      Orm.populate({models: [message]}).nodeify((err, messages) => {
        if (err)
          return cb(err)

        cb(null, messages[0])
      })
    })
  })
}

function typing (room_id, cb) {
  const socket = this
  if (!socket.user) {
    if (cb)
      return cb(Error.Unauthorized('Authentication required'))

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
      return cb(Error.Unauthorized('Authentication required'))

    return
  }

  io.to(room_id).emit('User.TypingEnded', {
    user_id: socket.user.id,
    room_id: room_id
  })
}

io.use((socket, next) => {
  const queueMessage = (room_id, message, push, cb) => {
    socket.message_queue.push({
      socket, message, room_id, push
    }, cb)
  }

  function handleMessage (payload, cb) {
    postMessage(socket, payload.room_id, payload.message, payload.push, cb)
  }

  const taskMessage = (socket, task_id, message, cb) => {
    Task.get(task_id).nodeify((err, task) => {
      if (err)
        return cb(err)

      DealChecklist.get(task.checklist).nodeify((err, checklist) => {
        if (err)
          return cb(err)

        Deal.limitAccess({
          user: socket.user,
          deal_id: checklist.deal
        }, err => {
          if (err)
            return cb(err)

          const formatter = notification => {
            notification.auxiliary_subject_class = 'Deal'
            notification.auxiliary_subject = checklist.deal
          }

          queueMessage(task.room, message, formatter, cb)
        })
      })
    })
  }

  const normalMessage = (socket, room_id, message, cb) => {
    queueMessage(room_id, message, true, cb)
  }

  socket.message_queue = async.queue(handleMessage, 1)

  socket.on('Task.Message.Send', SocketServer.transaction(taskMessage, socket))
  socket.on('Message.Send', SocketServer.transaction(normalMessage, socket))
  socket.on('User.Typing', typing)
  socket.on('User.TypingEnded', typingEnded)
  next()
})
