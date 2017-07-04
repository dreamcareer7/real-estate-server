const io = SocketServer.io


function ackRoom (socket, room_id, cb) {
  if (!socket.user)
    return cb(Error.Unauthorized('Authentication required'))

  Notification.ackRoom(socket.user.id, room_id, cb)
}

io.use((socket, next) => {
  const room = SocketServer.transaction(ackRoom, socket)

  socket.on('Room.Acknowledge', room)
  next()
})
