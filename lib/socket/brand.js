const Brand = require('../models/Brand')

const {
  transaction
} = require('./transaction')

let io

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

const unregisterFromBrand = (socket, brand, cb) => {
  socket.leave(brand)

  if (cb)
    return cb()
}

const init = SocketServer => {
  io = SocketServer.io

  io.use((socket, next) => {
    socket.on('Brand.Register', transaction(registerToBrand, socket))
    socket.on('Brand.Unregister', unregisterFromBrand.bind(null, socket))
    next()
  })
}

module.exports = init
