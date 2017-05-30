/**
 * @namespace Admin
 */

const db = require('../utils/db.js')

Admin = {}

Admin.removePhone = function(user_id, cb) {
  db.query('admin/remove_phone', [user_id], cb)
}

Admin.listPhones = function(cb) {
  db.query('admin/list_phones', [], (err, res) => {
    if(err)
      return cb(err)

    return cb(null, res.rows)
  })
}

module.exports = function () {}
