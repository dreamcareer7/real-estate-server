const io = SocketServer.io

const registerToBrand = (socket, brand, cb) => {
  if (!cb)
    cb = () => {}

  if (!socket.user) {
    if (cb)
      return cb(Error.Unauthorized('Authentication required'))
  }
  Brand.limitAccess({
    brand,
    user: socket.user.id
  }).nodeify(err => {
    if (err)
      return cb(err)

    socket.join(brand)

    cb()
  })
}

io.use((socket, next) => {
  socket.on('Brand.Register', SocketServer.transaction(registerToBrand, socket))
  next()
})
