const db = require('../utils/db.js')
const SocketIO = require('socket.io')
const queue = require('../../lib/utils/queue.js')
const EventEmitter = require('events').EventEmitter
const uuid = require('node-uuid')

const redis = require('socket.io-redis')
const config = require('../config.js')

let io
const adapter = redis(config.redis.url)

SocketServer = new EventEmitter()

SocketServer.transaction = function (fn, socket) {
  return function () {
    const args = Array.prototype.slice.call(arguments)
    const cb = args[args.length - 1]

    const user_name = socket.user ? socket.user.email : 'Guest'
    const id = `${fn.name}-${user_name}-${uuid.v1().substr(0,10)}`
    const context = Context.create({id})

    Context.log('Entering', id)

    context.enter()

    context.set({
      user: socket.user,
      function: fn.name,
      socket
    })

    db.conn(function (err, conn, done) {
      SocketServer.emit('transaction', context)

      if (err) {
        if (typeof cb === 'function')
          return cb(Error.Database(err))

        return
      }

      const queries = context.get('query_count') || 0

      const rollback = function () {
        context.unset('db')
        Context.log('Rolling back Socket'.red)
        conn.query('ROLLBACK', done)
      }

      const commit = () => {
        conn.query('COMMIT', function () {
          context.unset('db')

          Job.handle(context.get('jobs'), err => {
            if (err)
              Context.log('⚠ SOCKET JOB Panic:'.red, err, err.stack)

            Context.log('Socket OK'.green, `Σ${queries}`)
            done()
          })
        })
      }

      context.on('error', function (e) {
        delete e.domain
        delete e.domainThrown
        delete e.domainEmitter
        delete e.domainBound

        Context.log('⚠ SOCKET Panic:'.yellow, e, e.stack)
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

        context.set({
          db: conn,
          jobs: []
        })

        args.unshift(socket)
        fn.apply(null, args)
      })
    })
  }
}

module.exports = attach

queue.process('socket_emit', 10000, function (job, done) {
  job.data.args.unshift(job.data.event)
  const r = io.to(job.data.room)
  r.emit.apply(r, job.data.args)

  return done()
})

const JOIN_ROOM = 'join_room'

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

function attach (server) {
  io = new SocketIO(server)
  io.adapter(adapter)

  io.of('/').adapter.customHook = (data, cb) => {
    const dispatcher = dispatchers[data.request_type]

    if (typeof dispatcher !== 'function')
      return

    dispatchers[data.request_type](data, cb)
  }

  SocketServer.io = io;

  [
    'authentication',
    'messaging',
    'notification',
    'brand'
  ].map(name => require('./' + name + '.js'))
}

process.on('SIGTERM', () => {
  Context.log('[SIGTERM] socket.io server: closing')
  io.close(() => {
    Context.log('[SIGTERM] socket.io server: closed')
  })
})
