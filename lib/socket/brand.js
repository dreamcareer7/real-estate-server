const io = SocketServer.io

const registerToBrand = (socket, brand, cb) => {
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
