const SocketIO = require('socket.io')
const queue = require('../../lib/utils/queue.js')
const EventEmitter = require('events').EventEmitter
const Context = require('../models/Context')

const redis  = require('socket.io-redis')
const config = require('../config.js')

let io
const adapter = redis(config.redis.url)

const SocketServer = new EventEmitter()

module.exports = SocketServer

const JOIN_ROOM = 'join_room'

/*
 * JOIN_ROOM's dont expect a reply.
 * Therefore it just calls the callback anyways.
 */

const joinRoom = (data, cb) => {
  // eslint-disable-next-line
  cb()

  const sockets = io.sockets.adapter.rooms[data.user_id]
  if (!sockets)
    return

  // Connect his WS connection to appropriate rooms
  Object.keys(sockets.sockets).map(socket_id => {
    const socket = io.sockets.connected[socket_id]

    // Sometimes the socket id is there but the actual socket object is not there.
    if (!socket)
      return

    socket.join(data.room_id)
  })
}

const dispatchers = {}

dispatchers[JOIN_ROOM] = joinRoom

SocketServer.attach = server => {
  io = new SocketIO(server)
  io.adapter(adapter)

  io.of('/').adapter.customHook = (data, cb) => {
    const dispatcher = dispatchers[data.request_type]

    if (typeof dispatcher !== 'function')
      return

    dispatchers[data.request_type](data, cb)
  }

  SocketServer.io = io

  const { getUserStatus } = require('./authentication')(SocketServer)
  require('./messaging')(SocketServer)
  require('./notification')(SocketServer)
  require('./brand')(SocketServer)

  SocketServer.getUserStatus = getUserStatus

  SocketServer.ready = true

  queue.process('socket_join', 10000, (job, done) => {
    done() // The callbacks expect no answer. Free the queue.

    const status = SocketServer.getUserStatus(job.data.user)

    io.to(job.data.room_id).emit('User.State', status, job.data.user.id)

    io.of('/').adapter.customRequest({
      request_type: JOIN_ROOM,
      room_id: job.data.room_id,
      user_id: job.data.user.id
    }, () => {

    })
  })

  queue.process('socket_emit', 10000, function (job, done) {
    Context.log('Emitting Socket Event', job.data.event, 'to', job.data.room)
    job.data.args.unshift(job.data.event)
    const r = io.to(job.data.room)
    r.emit.apply(r, job.data.args)

    return done()
  })
}

process.on('SIGTERM', () => {
  Context.log('[SIGTERM] socket.io server: closing')
  io.close(() => {
    Context.log('[SIGTERM] socket.io server: closed')
  })
})
