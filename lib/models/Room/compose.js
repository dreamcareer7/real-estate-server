const User = require('../User/create')
const async = require('async')
const _u = require('underscore')

const { getOrCreateDirectRoom, create } = require('./create')

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

    if (users.length === 2)
      return getOrCreateDirectRoom(users[0], users[1]).nodeify(cb)

    // room.users needs to be an array of objects. Each object what Room.addUser expects.
    room.users = _u
      .without(users, self)
      .map(user_id => {
        return {
          user_id
        }
      })

    return create(room).nodeify(cb)
  })
}

module.exports = { compose }
