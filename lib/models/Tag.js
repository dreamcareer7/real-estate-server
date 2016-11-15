const db = require('../utils/db.js')

Tag = {}

Tag.getAll = function (cb) {
  if (!process.domain.user)
    return cb(null, [])

  db.query('tag/get_all', [process.domain.user.id], (err, res) => {
    if (err)
      return cb(err)

    return cb(null, res.rows)
  })
}

module.exports = function () {

}
