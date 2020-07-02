const async = require('async')
const _u = require('underscore')

const db = require('../../utils/db.js')
const promisify = require('../../utils/promisify')
const validator = require('../../utils/validator.js')

const ObjectUtil = require('../ObjectUtil')
const User = require('../User/create')
const RoomUsers = require('./users')

const debug = require('debug')('rechat:rooms')

const schema = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      required: false
    },

    owner: {
      type: 'string',
      uuid: true,
      required: false
    },

    room_type: {
      type: 'string',
      required: true,
      enum: [ 'Group', 'Direct', 'Personal', 'Task', 'ListingBoard' ]
    },

    users: {
      type: 'array',
      required: false,
      minItems: 0,
      items: {
        type: 'string',
        uuid: true
      }
    },

    phone_numbers: {
      type: 'array',
      required: false,
      minItems: 0,
      items: {
        type: 'string',
        phone: true
      }
    },

    emails: {
      type: 'array',
      required: false,
      minItems: 0,
      items: {
        type: 'string',
        email: true
      }
    }
  }
}

const validate = validator.bind(null, schema)

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
    await promisify(RoomUsers.addUser)({
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
      await promisify(RoomUsers.addUser)({
        inviting_id,
        user_id,
        room_id,
        connect_override: false
      })
    }
  }

  return room_id
}

const compose = function(room, cb) {
  async.auto({
    email_shadows: (cb, results) => {
      return async.map(room.emails, (r, cb) => {
        User.getOrCreateByEmail(r).nodeify((err, user) => {
          if(err)
            return cb(err)

          return cb(null, user.id)
        })
      }, cb)
    },
    phone_shadows: (cb, results) => {
      return async.map(room.phone_numbers, (r, cb) => {
        User.getOrCreateByPhoneNumber(r, (err, user) => {
          if(err)
            return cb(err)

          return cb(null, user.id)
        })
      }, cb)
    }
  }, (err, results) => {
    if(err)
      return cb(err)

    const e = results.email_shadows || []
    const p = results.phone_shadows || []
    const u = room.users || []
    const self = room.owner || null

    const users = _u.uniq(u.concat(e).concat(p).concat(self).filter(Boolean))
    if(users.length === 2)
      return getOrCreateDirectRoom(users[0], users[1]).nodeify(cb)

    room.users = _u.without(users, self)

    return create(room).nodeify(cb)
  })
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
    users: [ user_id, peer_id ]
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

module.exports = {
  create,
  compose,
  createDirect,
  getOrCreateDirectRoom,
}
