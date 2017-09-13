const io = SocketServer.io

const registerToBrand = (socket, brand, cb) => {
  console.log('Limiting access')
  Brand.limitAccess({
    brand,
    user: socket.user.id
  }).nodeify(err => {
    console.log('Limit access result', err)
    if (err)
      return cb(err)

    socket.join(brand)
    cb()
  })
}

io.use((socket, next) => {
  console.log('Registered handler')

  socket.on('Brand.Register', SocketServer.transaction(registerToBrand, socket))
  next()
})
