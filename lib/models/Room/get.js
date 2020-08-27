const _u = require('underscore')
const db = require('../../utils/db.js')
const ObjectUtil = require('../ObjectUtil')

const { getAbbreviatedDisplayName } = require('../User/get')

const get = function (room_id, cb) {
  getAll([room_id], (err, rooms) => {
    if(err)
      return cb(err)

    if (rooms.length < 1)
      return cb(Error.ResourceNotFound(`Room ${room_id} not found`))

    const room = rooms[0]

    return cb(null, room)
  })
}

const getTitleForUser = function (room, user_id) {
  const users = room.users_info

  if(!users)
    return 'Empty'

  let current = undefined
  let p = users || []

  if (user_id) {
    current = _u.find(users, r => r.id === user_id)
    p = _u.filter(users, r => r.id !== user_id)
  }

  const names = p.map(u => {
    return getAbbreviatedDisplayName(u)
  })

  if (names.length === 0) {
    if (user_id)
      return getAbbreviatedDisplayName(current)

    return 'Empty'
  }

  return names.join(', ')
}

const getAll = function(room_ids, cb) {
  const user_id = ObjectUtil.getCurrentUser()

  db.query('room/get', [[room_ids], user_id], (err, res) => {
    if (err)
      return cb(err)

    const rooms = res.rows.map(room => {
      room.proposed_title = getTitleForUser(room, ObjectUtil.getCurrentUser())

      return room
    })

    return cb(null, rooms)
  })
}

module.exports = {
  get,
  getAll,
  getTitleForUser
}
