const {
  ackRoom
} = require('../models/Notification/delivery')

let io


function _ackRoom (socket, room_id, cb) {
  if (!cb)
    cb = () => {}

  if (!socket.user)
    return cb(Error.Unauthorized('Authentication required'))

  ackRoom(socket.user.id, room_id, cb)
}

const init = SocketServer => {
  io = SocketServer.io

  io.use((socket, next) => {
    const room = SocketServer.transaction(_ackRoom, socket)

    socket.on('Room.Acknowledge', room)
    next()
  })
}

module.exports = init
