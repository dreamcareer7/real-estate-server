const async = require('async')
const debug = require('debug')('rechat:sockets:auth')
const queue = require('../../lib/utils/queue.js')
const config = require('../../lib/config.js')
const redis = require('redis')
const store = require('./authentication/store')

const redisClient = redis.createClient(config.redis)

const io = SocketServer.io

function considerOffline (socket, reason, cb) {
  if (!socket.user)
    return cb() // Wasnt a logged in user.

  store.remove({
    socket: socket.id,
    user: socket.user.id
  })

  if (store.isOnline(socket.user.id))
    return cb() // Has other connections available and is therefore, online

  announceUserStatus(socket, cb)
}

function authenticate (socket, access_token, cb) {
  const fin = err => {
    if (err)
      debug(err)
    else
      debug('Auth successful for', socket.user.email)

    cb(err, User.publicize(socket.user))
  }

  const getState = (uid, cb) => SocketServer.getUserStatus(uid, (err, state) => {
    if (err)
      return cb(err)

    cb(null, {user_id: uid, state: state})
  })

  const peersPresence = cb => {
    Room.getUserPeers(socket.user.id).nodeify((err, peers) => {
      if (err)
        return cb(err)

      async.map(peers, getState, (err, states) => {
        if (err)
          return cb(err)

        io.to(socket.user.id).emit('Users.States', states)
        cb()
      })
    })
  }

  async.series([
    cb => login(socket, access_token, cb),

    cb => {
      store.add({
        user: socket.user.id,
        socket: socket.id
      })
      cb()
    },

    cb => removeFromBackground(socket.user.id, cb),

    cb => announceUserStatus(socket, cb),

    cb => peersPresence(cb)
  ], fin)
}

function joinRooms(socket, cb) {
  // This room is dedicated to this user. All his devices will be connected to this room.
  socket.join(socket.user.id)

  Room.getUserRoomIds(socket.user.id).nodeify((err, rooms) => {
    if(err)
      return cb(err)

    if (!rooms)
      rooms = []

    rooms.forEach(r => socket.join(r))

    return cb()
  })
}

function announceUserStatus (socket, cb) {
  SocketServer.getUserStatus(socket.user.id, (err, status) => {
    if(err)
      status = User.OFFLINE

    User.markAsSeen(socket.user.id, socket.client_id)

    Room.getUserRoomIds(socket.user.id).nodeify((err, rooms) => {
      if(err)
        return cb(err)

      rooms.map(room => io.to(room).emit('User.State', status, socket.user.id))
      cb()
    })
  })
}

function login (socket, access_token, cb) {
  Token.get(access_token).nodeify(function (err, token) {
    if (err && err.code === 'ResourceNotFound')
      return cb(Error.Unauthorized('Invalid credentials'))

    if (err)
      return cb(err)

    if (token.expire_date) {
      const expirey = new Date(token.expire_date)

      if (expirey < (new Date()).getTime()) {
        return cb(Error.Unauthorized('Token expired'))
      }
    }

    if (token.token_type !== 'access')
      return cb(Error.Unauthorized('Invalid credentials'))

    User.get(token.user, function (err, user) {
      if (err)
        return cb(err)

      if (!user)
        return cb(Error.ResourceNotFound('Unknown user'))

      process.domain.user = user
      socket.user = user
      socket.client_id = token.client

      joinRooms(socket, cb)
    })
  })
}

function offlineSignal(socket, access_token, cb) {
  login(socket, access_token, err => {
    if (err)
      return cb(err)

    removeFromBackground(socket.user.id, () => {
      announceUserStatus(socket, cb)
    })
  })
}

const interval = 60 * 60 * 1000

const time = () => {
  return (new Date()).getTime()
}

function backgroundSignal (socket, cb) {
  if (!socket.user)
    return cb() // Wasnt a logged in user.

  redisClient.zadd('backgrounds', time(), socket.user.id, () => {})

  socket.disconnect()

  queue
    .create('announce_user_status', {
      user: socket.user.id,
    })
    .removeOnComplete(true)
    .delay(interval)
    .save()

  cb()
}

queue.process('announce_user_status', 10000, function (job, done) {
  const user = job.data.user

  SocketServer.getUserStatus(user, (err, status) => {
    if (err)
      return

    Room.getUserRoomIds(user).nodeify((err, rooms) => {
      if(err)
        return

      rooms.map(room => io.to(room).emit('User.State', status, user))
      done()
    })
  })
})

function removeFromBackground (user_id, cb) {
  redisClient.zrem('backgrounds', user_id, cb)
}

SocketServer.getUserStatus = (user_id, cb) => {
  const is_online = store.isOnline(user_id)

  if (is_online)
    return cb(null, User.ONLINE)

  redisClient.zscore('backgrounds', user_id, (err, score) => {
    if (err)
      return cb(null, User.OFFLINE)

    const out_for = time() - score

    if (out_for && out_for < interval)
      return cb(null, User.BACKGROUND)

    cb(null, User.OFFLINE)
  })
}

queue.process('socket_user_status', 10000, function (job, done) {
  SocketServer.getUserStatus(job.data.user_id, done)
})

io.use((socket, next) => {
  socket.on('Authenticate', SocketServer.transaction(authenticate, socket))

  socket.on('Background', SocketServer.transaction(backgroundSignal, socket))

  socket.on('Offline', SocketServer.transaction(offlineSignal, socket))

  socket.on('disconnect', SocketServer.transaction(considerOffline, socket))

  next()
})
