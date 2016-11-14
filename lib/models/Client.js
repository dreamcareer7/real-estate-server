const db = require('../utils/db.js')

Client = {}

Client.get = function (id, cb) {
  db.query('client/get', [id], function (err, res) {
    if (err)
      return cb(err)

    if (!res.rows[0])
      return cb(null, false)

    cb(null, res.rows[0])
  })
}

module.exports = function () {}
