const db = require('../../utils/db.js')

const { get: getRoom } = require('../Room/get')

const get = function (message_id, cb) {
  getAll([message_id], (err, messages) => {
    if(err)
      return cb(err)

    if (messages.length < 1)
      return cb(Error.ResourceNotFound(`Message ${message_id} not found`))

    const message = messages[0]

    return cb(null, message)
  })
}

const getAll = function(message_ids, cb) {
  db.query('message/get', [message_ids], (err, res) => {
    if (err)
      return cb(err)

    const messages = res.rows

    return cb(null, messages)
  })
}

const retrieve = function (room_id, paging, cb) {
  getRoom(room_id, function (err, room) {
    if (err)
      return cb(err)

    db.query('message/retrieve', [
      room_id,
      paging.type,
      paging.timestamp,
      paging.limit,
      paging.recommendation,
      paging.reference
    ], (err, res) => {
      if (err)
        return cb(err)

      if (res.rows.length < 1)
        return cb(null, [])

      const message_ids = res.rows.map(function (r) {
        return r.id
      })

      getAll(message_ids, (err, messages) => {
        if (err)
          return cb(err)

        if (res.rows.length > 0)
          messages[0].total = res.rows[0].total

        return cb(null, messages)
      })
    })
  })
}

module.exports = {
  get,
  getAll,
  retrieve
}
