const io = SocketServer.io


function ackNotification (notification_id, cb) {
  const socket = this
  if (!socket.user) {
    if (cb)
      return cb(Error.Unauthorized('Authentication required'))

    return
  }

  Notification.ack(socket.user.id, notification_id, cb)
}


io.use((socket, next) => {
  const ack = SocketServer.transaction(ackNotification, socket)

  socket.on('Notification.Ack', ack)
  next()
})
