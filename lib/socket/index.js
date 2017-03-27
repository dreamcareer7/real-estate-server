const db = require('../utils/db.js')
const Domain = require('domain')
const SocketIO = require('socket.io')
const queue = require('../../lib/utils/queue.js')
const EventEmitter = require('events').EventEmitter

let io

SocketServer = new EventEmitter()

function attach (server) {
  io = new SocketIO(server)
  SocketServer.io = io;

  [
    'authentication',
    'messaging'
  ].map(name => require('./' + name + '.js'))
}

SocketServer.transaction = function (fn, socket) {
  return function () {
    const args = Array.prototype.slice.call(arguments)
    const cb = args[args.length - 1]

    db.conn(function (err, conn, done) {
      const domain = Domain.create()
      domain.user = socket.user
      domain.function = fn.name
      domain.socket = socket

      SocketServer.emit('transaction', domain)

      if (err) {
        return cb(Error.Database(err))
      }

      const rollback = function () {
        console.log('<- Rolling back'.red)
        conn.query('ROLLBACK', done)
      }

      const commit = () => {
        conn.query('COMMIT', function () {
          Job.handle(domain.jobs, err => {
            if (err)
              console.log('⚠ SOCKET JOB Panic:'.red, err, err.stack)

            done()
          })
        })
      }

      domain.on('error', function (e) {
        delete e.domain
        delete e.domainThrown
        delete e.domainEmitter
        delete e.domainBound

        console.log('⚠ SOCKET Panic:'.yellow, e, e.stack)
        rollback()
      })

      if (typeof cb === 'function') {
        args[args.length - 1] = function (e) {
          if (e)
            throw e

          commit()
          cb.apply(socket, arguments)
        }
      } else
        args.push((e) => {
          if (e)
            throw e
          commit()
        })

      conn.query('BEGIN', function (err) {
        if (err)
          return fn(Error.Database(err))

        domain.db = conn
        domain.jobs = []

        args.unshift(socket)
        return domain.run(() => fn.apply(null, args))
      })
    })
  }
}

SocketServer.hasMembers = (room) => {
  const sockets = io.sockets.adapter.rooms[room]
  if (!sockets)
    return false

  if (Object.keys(sockets.sockets).length < 1)
    return false

  // Sometimes the socket id is there but the actual socket object is not there.
  // Filter those cases out. The remainder is actual socket connections.
  return (
    Object.keys(sockets.sockets)
    .filter(id => io.sockets.connected[id])
    .length > 0
  )
}

module.exports = attach

console.log('Registering socket server')
queue.process('socket_emit', 10000, function (job, done) {
  console.log('socket_emit called')
  if (!SocketServer.hasMembers(job.data.room))
    return done('No online users found')

  console.log('socket_emit is about to be successfull')
  job.data.args.unshift(job.data.event)
  const r = io.to(job.data.room)
  r.emit.apply(r, job.data.args)

  return done()
})

queue.process('socket_join', 10000, (job, done) => {
  done() // The callbacks expect no answer. Free the queue.

  if (!SocketServer.hasMembers(job.data.user_id))
    return

  const sockets = io.sockets.adapter.rooms[job.data.user_id]
  if (!sockets)
    return

  // Announce to others that he is online
  io.to(job.data.room_id).emit('User.State', User.ONLINE, job.data.user_id)

  // Connect his WS connection to appropriate rooms
  Object.keys(sockets.sockets).map(socket_id => {
    const socket = io.sockets.connected[socket_id]

    // Sometimes the socket id is there but the actual socket object is not there.
    if (!socket)
      return

    socket.join(job.data.room_id)
    socket.user.rooms.push(job.data.room_id)
  })
})
