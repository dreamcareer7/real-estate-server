const async = require('async')
const config = require('../config.js')

function ping (req, res) {
  res.status(200)
  return res.end('pong')
}

function asyncFail (req, res) {
  setTimeout(() => {
    throw new Error('foo')
  })

  setTimeout(() => {
    throw new Error('foo')
  })

  setTimeout(() => {
    res.send('bar')
  })
}

function removePhone (req, res) {
  if (config.webapp.hostname === 'rechat.com')
    return res.error(Error.Forbidden('Access denied'))

  const q = req.query.q

  Admin.removePhone(q, err => {
    if(err)
      return res.error(err)

    res.status(200)
    return res.end()
  })
}

function connections (req, res) {
  const room = SocketServer.io.sockets.adapter.rooms[req.params.room]
  if (!room)
    return res.json('Empty room')

  const collect = function (socket_id, cb) {
    const socket = SocketServer.io.sockets.connected[socket_id]
    if (!socket)
      return cb(null, {
        socket_id: socket_id,
        value: socket,
        message: 'Socket not here!'
      })

    const data = {
      user: socket.user ? socket.user.email : 'Guest',
      agent: socket.handshake.headers['user-agent']
    }

    const timedout = () => {
      data.ping_response = 'Timeout!'
      cb(null, data)
    }
    const timeout = setTimeout(timedout, 5000)

    socket.emit('ping', (err, response) => {
      clearTimeout(timeout)

      if (err)
        data.ping_response = err
      else
        data.ping_response = response

      cb(null, data)
    })
  }

  // socket.emit loses domain.
  const domain = process.domain

  async.map(Object.keys(room.sockets), collect, (err, connections) => {
    domain.enter()
    if (err)
      return res.error(err)

    res.json(connections)
  })
}

const router = function (app) {
  app.get('/admin/ping', ping)
  app.get('/admin/async_fail', asyncFail)
  app.delete('/admin/users/phone', removePhone)
  app.get('/admin/connections/:room', connections)
}

module.exports = router
