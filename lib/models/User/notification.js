const db = require('../../utils/db.js')

const {
  get
} = require('./get')

const shouldTryEmail = function(user) {
  // We don't have an email for this user
  if (!user.email) return false

  // Don't try sending an actual email to a fake email address
  if (user.fake_email) return false

  return true
}

const shouldTrySMS = function(user) {
  // Dont send SMS. We're going to send an email.
  if (user.email && !user.fake_email) return false

  // Dont try sending an SMS. We dont have his number.
  if (!user.phone_number) return false

  return true
}

const isPushOK = function(user_id, cb) {
  get(user_id).nodeify(function(err, user) {
    if (err) return cb(err)

    // @ts-ignore
    db.query('user/ok_push', [user_id], function(err, res) {
      if (err) return cb(err)

      return cb(null, res.rows[0].remaining)
    })
  })
}


module.exports = {
  shouldTryEmail,
  shouldTrySMS,
  isPushOK
}
