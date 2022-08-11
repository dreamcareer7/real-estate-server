const async = require('async')
const debug = require('debug')('rechat:sockets:auth')
const store = require('./authentication/store')
const Context = require('../models/Context')
const Token = require('../models/Token')

const {
  getAll: getAllUsers,
  get: getUser,
} = require('../models/User/get')

const {
  getUserPeers,
  getUserRoomIds
} = require('../models/Room/users/get')

const {
  ONLINE,
  OFFLINE,
  BACKGROUND
} = require('../models/User/constants')

const {
  publicize
} = require('../models/User/orm')

const {
  markAsSeen
} = require('../models/User/last-seen')

const {
  transaction
} = require('./transaction')

let io

function considerOffline (socket, reason, cb) {
  Context.log('Considering offline', reason, typeof cb)
  if (!socket.user) {
    if (cb) return cb()

    return
  }
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
    if (err) {
      debug(err)
      return cb(err)
    }

    debug('Auth successful for', socket.user.email)
    cb(null, publicize(socket.user))
  }


  const states = {}

  const peersPresence = cb => {
    getUserPeers(socket.user.id).nodeify((err, peers) => {
      if (err)
        return cb(err)


      getAllUsers(peers).nodeify((err, users) => {
        if (err)
          return cb(err)

        for(const user of users) {
          socket.join(`${user.id}-State`)

          states[user.id] = {
            state: getUserStatus(user),
            user_id: user.id
          }
        }

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

    cb => announceUserStatus(socket, cb),

    cb => peersPresence(cb)
  ], fin)
}

function joinRooms(socket, cb) {
  // This room is dedicated to this user. All his devices will be connected to this room.
  socket.join(socket.user.id)

  getUserRoomIds(socket.user.id).nodeify((err, rooms) => {
    if(err)
      return cb(err)

    rooms.forEach(r => socket.join(r))

    cb()
  })
}

function announceUserStatus (socket, cb) {
  const status = getUserStatus(socket.user)

  markAsSeen({
    user_id: socket.user.id,
    client_id: socket.client_id,
    time: new Date()
  })

  io.to(`${socket.user.id}-State`).emit('User.State', status, socket.user.id)
  cb()
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

    getUser(token.user).nodeify(function (err, user) {
      if (err)
        return cb(err)

      if (!user)
        return cb(Error.ResourceNotFound('Unknown user'))

      Context.set({user})
      socket.user = user
      socket.client_id = token.client

      joinRooms(socket, cb)
    })
  })
}

function offlineSignal(socket, access_token, cb) {
  if (typeof access_token === 'function') {
    cb = access_token
    access_token = null
  }

  if (!cb) {
    Context.warn('[offlineSignal] cb is still undefined!')
    cb = () => {}
  }

  login(socket, access_token, err => {
    if (err)
      return cb(err)

    announceUserStatus(socket, cb)
  })
}

const interval = 60 * 60 * 1000

const getUserStatus = user => {
  const is_online = store.isOnline(user.id)

  if (is_online)
    return ONLINE

  if (!user.last_seen_at)
    return OFFLINE

  if (user.last_seen_type !== 'Mobile')
    return OFFLINE

  const last_seen = new Date(user.last_seen_at * 1000)

  if (Date.now() < (last_seen.getTime() + interval))
    return BACKGROUND

  return OFFLINE
}

const init = SocketServer => {
  io = SocketServer.io

  io.use((socket, next) => {
    socket.on('Authenticate', transaction(authenticate, socket))

    socket.on('Offline', transaction(offlineSignal, socket))

    socket.on('disconnect', transaction(considerOffline, socket))

    next()
  })

  return {
    getUserStatus
  }
}

module.exports = init
