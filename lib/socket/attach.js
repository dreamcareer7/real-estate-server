const SocketIO = require('socket.io')
const { peanar } = require('../utils/peanar')
const Context = require('../models/Context')

const redis  = require('socket.io-redis')
const config = require('../config.js')

const SocketServer = require('./index')

let io
const adapter = redis(config.redis.url)

const _join = (user, room_id) => {
  const status = SocketServer.getUserStatus(user)

  SocketServer.io.to(room_id).emit('User.State', status, user.id)

  SocketServer.io.of('/').adapter.customRequest({
    request_type: JOIN_ROOM,
    user_id: user.id
  }, () => {

  })
}

const _emit = (room, event, args) => {
  Context.log('Emitting Socket Event', event, 'to', room)
  const r = SocketServer.io.to(room)
  r.emit(event, ...args)
}

const join = peanar.job({
  handler: _join,
  name: 'socket_join',
  queue: 'socket',
  exchange: 'socket',
  max_retries: 20,
  retry_exchange: 'socket.retry',
  error_exchange: 'socket.error'
})

const emit = peanar.job({
  handler: _emit,
  name: 'socket_emit',
  queue: 'socket',
  exchange: 'socket',
  max_retries: 20,
  retry_exchange: 'socket.retry',
  error_exchange: 'socket.error'
})


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

const attach = server => {
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

  peanar.declareAmqResources().then(() => {
    peanar.worker({
      queues: ['socket'],
      concurrency: 100
    })
  })
}

process.on('SIGTERM', () => {
  Context.log('[SIGTERM] socket.io server: closing')
  io.close(() => {
    Context.log('[SIGTERM] socket.io server: closed')
  })
})

module.exports = { attach, join, emit }
