const Context = require('../Context')
const Room = require('../Room')

const { get } = require('./get')

const connectToUser = function(user_id, peer_id, source_type, brand, cb) {
  if (!peer_id || !user_id) {
    Context.log('>>> (User::create::user_connect) No connect user specified')
    return cb()
  }

  const override = {
    title: 'Welcome to Rechat',
    message:
      'Welcome to Rechat, you can send messages here. It\'s the fastest way to get a hold of me.',
    from: peer_id,
    connect: {
      source_type: source_type || 'BrokerageWidget',
      brand: brand || null
    }
  }

  get(peer_id).nodeify(err => {
    if (err) return cb(err)

    Room.bulkCreateWithUsers(user_id, [peer_id], override, (err, rooms) => {
      if (err) return cb(err)

      return cb(null, rooms[0])
    })
  })
}

/**
 * @param {UUID} user_id
 * @param {UUID} room_id
 * @param {Callback<any>} cb
 */
const connectToRoom = function(user_id, room_id, cb) {
  if (!room_id || !user_id) {
    return cb()
  }

  Room.get(room_id, err => {
    if (err) return cb(err)

    Context.log(
      '>>> (User::create::user_connect) Connecting this user with room',
      room_id
    )
    return Room.addUser({ user_id, room_id }, cb)
  })
}

module.exports = {
  connectToRoom,
  connectToUser
}
