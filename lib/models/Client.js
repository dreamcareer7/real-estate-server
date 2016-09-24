const db = require('../utils/db.js')

Client = {}

// SQL queries to work with Client object
const sql_get = require('../sql/client/get.sql')

Client.get = function (id, cb) {
  db.query(sql_get, [id], function (err, res) {
    if (err)
      return cb(err)

    if (!res.rows[0])
      return cb(null, false)

    cb(null, res.rows[0])
  })
}

module.exports = function () {}
