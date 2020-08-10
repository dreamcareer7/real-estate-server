const async = require('async')
const Task = require('../models/Task')
const Orm = require('../models/Orm/index')

const {
  post: postMessage
} = require('../models/Message/post')

const {
  get: getRoom
} = require('../models/Room/get')

const {
  notifyById
} = require('../models/Deal/live')

const {
  transaction
} = require('./transaction')

let io

function _postMessage (sock, room_id, message, push, cb) {
  if (!sock.user)
    return cb(Error.Unauthorized('Authentication required'))

  message.author = sock.user.id

  getRoom(room_id, function (err, room) {
    if (err)
      return cb(err)

    postMessage(room_id, message, push, function (err, message) {
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

const init = SocketServer => {
  io = SocketServer.io

  io.use((socket, next) => {
    const queueMessage = (room_id, message, push, cb) => {
      socket.message_queue.push({
        socket, message, room_id, push
      }, cb)
    }

    function handleMessage (payload, cb) {
      _postMessage(socket, payload.room_id, payload.message, payload.push, cb)
    }

    const taskMessage = (socket, task_id, message, cb) => {
      if (!socket.user)
        return cb(Error.Unauthorized('Authentication required'))

      Task.addUser({
        user: socket.user,
        task_id
      }).nodeify((err, task) => {
        if (err)
          return cb(err)

        queueMessage(task.room, message, true, (err, saved) => {
          if (err)
            return cb(err)

          notifyById(task.deal).nodeify(err => {
            if (err)
              return cb(err)

            cb(null, saved)
          })
        })
      })
    }

    const normalMessage = (socket, room_id, message, cb) => {
      queueMessage(room_id, message, true, cb)
    }

    socket.message_queue = async.queue(handleMessage, 1)

    socket.on('Task.Message.Send', transaction(taskMessage, socket))
    socket.on('Message.Send', transaction(normalMessage, socket))
    socket.on('User.Typing', typing)
    socket.on('User.TypingEnded', typingEnded)
    next()
  })
}

module.exports = init
