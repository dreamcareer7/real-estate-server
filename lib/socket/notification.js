const io = SocketServer.io


function ackRoom (room_id, cb) {
  const socket = this
  if (!socket.user) {
    if (cb)
      return cb(Error.Unauthorized('Authentication required'))

    return
  }

  Notification.ackRoom(socket.user.id, room_id, cb)
}

io.use((socket, next) => {
  const room = SocketServer.transaction(ackRoom, socket)

  socket.on('Room.Acknowledge', room)
  next()
})
