const db = require('../../utils/db.js')

const confirmEmail = function(id, cb) {
  // @ts-ignore
  db.query('user/confirm_email', [id], (err, res) => {
    if (err) return cb(err)

    return cb()
  })
}

const confirmPhone = function(id, cb) {
  // @ts-ignore
  db.query('user/confirm_phone', [id], (err, res) => {
    if (err) return cb(err)

    return cb()
  })
}

module.exports = {
  confirmEmail,
  confirmPhone
}
