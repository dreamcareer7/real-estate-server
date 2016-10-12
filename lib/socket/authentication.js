const async = require('async')
const debug = require('debug')('rechat:sockets:auth')
const queue = require('../../lib/utils/queue.js')
const config = require('../../lib/config.js')
const redis = require('redis')

const redisClient = redis.createClient(config.redis)

const io = SocketServer.io

const time = () => {
  return (new Date()).getTime()
}

function authenticate (socket, access_token, cb) {
  const fin = (err, user) => {
    if (err)
      debug(err)
    else
      debug('Auth successful for', user.email)

    cb(err, user)
  }

  const getState = (uid, cb) => SocketServer.getUserStatus(uid, (err, state) => {
    if (err)
      return cb(err)

    cb(null, {user_id: uid, state: state})
  })

  const peersPresence = () => {
    async.map(socket.user.rooms.map(r => r.id), Room.getUsersIDs, (err, results) => {
      if (err)
        return cb(err)

      const users = new Set()
      results.forEach(room_users => {
        room_users.map(uid => users.add(uid))
      })

      async.map(Array.from(users), getState, (err, states) => {
        if (err)
          return cb(err)

        io.to(socket.user.id).emit('Users.States', states)
      })
    })
  }

  login(socket, access_token, (err) => {
    if (err)
      return fin(err)

    // It removes previous Background indications and also announces to everyone that he is online.
    removeFromBackground(socket.user.id)
    announceUserStatus(socket)

    peersPresence()

    fin(null, User.publicize(socket.user))
  })
}

function joinRooms(socket, cb) {
  const joinRoom = room => socket.join(room.id)

  // If user disconnectrs before getUserRooms is completed,
  // socket.user.rooms will not be an array, which makes the app crash later
  // on the sendSignals function.
  // Defining the array here prevents that
  socket.user.rooms = []

  // This room is dedicated to this user. All his devices will be connected to this room.
  socket.join(socket.user.id, () => {
    Room.getUserRooms(socket.user.id, {}, (err, rooms) => {
      if(err)
        return cb(err)

      if (!rooms)
        rooms = []

      socket.user.rooms = rooms

      rooms.map(joinRoom)

      return cb()
    })
  })
}

function announceUserStatus (socket) {
  SocketServer.getUserStatus(socket.user.id, (err, status) => {
    if(err)
      status = User.OFFLINE

    socket.user.rooms.map(room => io.to(room.id).emit('User.State', status, socket.user.id))
  })
}

function login (socket, access_token, cb) {
  Token.get(access_token, function (err, token) {
    if (err)
      return cb(err)

    if (!token)
      return cb(Error.Unauthorized('Invalid credentials'))

    if (token.expire_date) {
      const expirey = new Date(token.expire_date)

      if (expirey < (new Date()).getTime()) {
        return cb(Error.Unauthorized('Token expired'))
      }
    }

    if (token.type !== 'access')
      return cb(Error.Unauthorized('Invalid credentials'))

    User.get(token.user_id, function (err, user) {
      if (err)
        return cb(err)

      if (!user)
        return cb(Error.ResourceNotFound('Unknown user'))

      process.domain.user = user
      socket.user = user
      joinRooms(socket, cb)
    })
  })
}

function offlineSignal(socket, access_token) {
  login(socket, access_token, err => {
    if (err)
      return
    removeFromBackground(socket.user.id, () => {
      announceUserStatus(socket)
    })
  })
}

function considerOffline (socket) {
  if (!socket.user)
    return  // Wasnt a logged in user.

  if (SocketServer.hasMembers(socket.user.id))
    return  // Has other connections available and is therefore, online

  announceUserStatus(socket)
}

const interval = 60 * 60 * 1000

function considerAsBackground (socket) {
  if (!socket.user)
    return  // Wasnt a logged in user.

  redisClient.zadd('backgrounds', time(), socket.user.id, () => {})

  queue
    .create('announce_user_status', {
      user: socket.user.id,
      rooms: socket.user.rooms.map(r => r.id)
    })
    .removeOnComplete(true)
    .delay(interval)
    .save()
}

queue.process('announce_user_status', 10000, function (job, done) {
  done()

  const user = job.data.user
  const rooms = job.data.rooms

  SocketServer.getUserStatus(user, (err, status) => {
    if (err)
      return

    rooms.map(room => io.to(room).emit('User.State', status, user))
  })
})

function removeFromBackground (user_id, cb) {
  if (!cb) // cb is optional
    cb = () => {}

  redisClient.zrem('backgrounds', user_id, cb)
}

SocketServer.getUserStatus = (user_id, cb) => {
  if (SocketServer.hasMembers(user_id))
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

  socket.on('Background', () => {
    if (!socket.user)
      return

    considerAsBackground(socket)
    announceUserStatus(socket)
  })

  socket.on('Offline', SocketServer.transaction(offlineSignal, socket))

  socket.on('disconnect', () => considerOffline(socket))

  next()
})
