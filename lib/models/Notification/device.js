const async = require('async')
const db = require('../../utils/db.js')
const Context = require('../Context')
const urbanAirshipTokenHelper = require('./urban_airship_reports_service')


const {
  get: getUser
} = require('../User/get')

const getAppBadgeForUser = function (user_id, cb) {
  db.query('notification/app_badge', [user_id], (err, res) => {
    if (err)
      return cb(err)

    cb(null, res.rows[0].app_badge)
  })
}

const getDeviceTokensForUser = function (user_id, cb) {
  getUser(user_id).nodeify((err, user) => {
    if (err)
      return cb(err)

    db.query('notification/user_channels', [user_id], (err, res) => {
      if (err)
        return cb(err)



      const invalidTokens = []
      const tokens = []

      async.each(
        res.rows,
        (r, calbk) => {
          urbanAirshipTokenHelper.isTokenValid(r.channel).nodeify((err, result) => {
            // TODO: (JAVAD) => What if other situations happen, e.g. any network error, then shall we delete the token?
            if (err || !result) {
              invalidTokens.push(r.channel)
              return calbk()
            }
            tokens.push(r.channel)
            calbk()
          })
        },
        (err) => {
          if (err) {
            Context.log(err)
          }
          deleteInvalidTokensForUser(user_id, invalidTokens).nodeify(err => {
            if (err) {
              Context.log('Error deleting invalid tokens form notifications_tokens for user: %s\n', user_id, err)
            }
            return cb(null, tokens)
          })
        }
      )
    })
  })
}

const deleteInvalidTokensForUser = async function (userID, tokenList) {
  return db.query.promise('notification/tokens/delete', [userID, tokenList])
}

module.exports = {
  getAppBadgeForUser,
  getDeviceTokensForUser
}
