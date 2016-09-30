const db = require('../utils/db.js')

const sql_get_all = require('../sql/tag/get_all.sql')

Tag = {}

Tag.getAll = function (cb) {
  if (!process.domain.user)
    return cb(null, [])

  db.query(sql_get_all, [process.domain.user.id], (err, res) => {
    if (err)
      return cb(err)

    return cb(null, res.rows)
  })
}

module.exports = function () {

}
