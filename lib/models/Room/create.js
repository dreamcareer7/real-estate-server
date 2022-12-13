const async = require('async')
const db = require('../../utils/db.js')
const promisify = require('../../utils/promisify')

const ObjectUtil = require('../ObjectUtil')

const {
  addUser
} = require('./users/add')

const {
  post: postMessage
} = require('../Message/post')

const debug = require('debug')('rechat:rooms')

const { validate } = require('./validate')

/**
 * Inserts a `room` object into database
 * @param {any} room - full room object
 * @returns {Promise<UUID>} ID of the room created
 */
async function insert(room) {
  return db.insert('room/insert', [
    room.room_type,
    room.title,
    room.owner
  ])
}

/**
 * Creates a `room`
 */
const create = async function (room) {
  await promisify(validate)(room)
  
  /** @type {UUID} */
  const room_id = await insert(room)

  if (room.owner) {
    await promisify(addUser)({
      room_id,
      inviting_id: false,
      user_id: room.owner,
      connect_override: false,
      reference: room.owner_reference
    })
  }

  if (Array.isArray(room.users)) {
    const inviting_id = room.disable_invitations
      ? false
      : ObjectUtil.getCurrentUser()
        || room.owner
        || false

    for (const user_id of room.users) {
      const user = {
        inviting_id,
        room_id,
        connect_override: false
      }

      if (typeof user_id === 'object')
        Object.assign(user, user_id)
      else
        user.user_id = user_id

      await promisify(addUser)(user)
    }
  }

  return room_id
}

/**
 * Creates a `room` of type `Direct` between two users
 * @name createPrivateMessage
 * @function
 * @memberof Room
 * @instance
 * @public
 * @param {UUID} user_id - ID of the referenced user
 * @param {UUID} peer_id - ID of the second referenced user
 * @returns {Promise<UUID>} ID of the created room
 */
const createDirect = async function (user_id, peer_id) {
  const room = {
    room_type: 'Direct',
    users: [
      {
        user_id
      },
      {
        user_id: peer_id
      }
    ]
  }

  return create(room)
}

/**
 * Get or create a direct room between two users
 * @param {UUID} user_id
 * @param {UUID} peer_id
 * @returns {Promise<UUID>} Id of the created room
 */
const getOrCreateDirectRoom = async function (user_id, peer_id) {
  const existing = await db.selectOne('room/find_direct', [user_id, peer_id])

  if (existing) {
    debug('Found a previously existing direct room with id:', existing.id, 'between users:', user_id, '<->', peer_id)
    return existing.id
  }

  debug('Creating a new direct room between users:', user_id, '<->', peer_id)
  return createDirect(user_id, peer_id)
}

const bulkCreateWithUsers = function (user, users, override, cb) {
  const room = {
    room_type: 'Group',
    owner: user,
    title: override.title || undefined
  }

  async.map(users, (r, cb) => {
    async.auto({
      room_id: cb => {
        create(room).nodeify(cb)
      },
      add_peer: [
        'room_id',
        (cb, results) => {
          addUser({
            inviting_id: user,
            user_id: r,
            room_id: results.room_id,
            connect_override: override.connect
          }, cb)
        }
      ],
      message: [
        'add_peer',
        'room_id',
        (cb, results) => {
          if (!override.message)
            return cb()

          const message = {
            author: override.from || user,
            comment: override.message
          }

          return postMessage(results.room_id, message, true, cb)
        }
      ]
    }, (err, results) => {
      if (err)
        return cb(err)

      return cb(null, results.room_id)
    })
  }, cb)
}

module.exports = {
  create,
  createDirect,
  getOrCreateDirectRoom,
  bulkCreateWithUsers
}
