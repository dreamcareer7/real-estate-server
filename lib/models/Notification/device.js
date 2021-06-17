const emojify = require('emojify.js')
const async = require('async')
const db = require('../../utils/db.js')
const Context = require('../Context')
const urbanAirshipTokenHelper = require('./urban_airship_reports_service')
const UrbanAirshipPush = require('urban-airship-push')
const config = require('../../config.js')


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

const registerForPush = function (user_id, channel_id, app, cb) {
  if (cb === undefined) {
    cb = app
    app = 'rechat'
  }
  
  if (!channel_id)
    return cb(Error.Validation('Channel ID cannot be null'))

  async.auto({
    user: cb => {
      return getUser(user_id).nodeify(cb)
    },
    register:
      cb => {
        db.query('notification/register_push', [user_id, channel_id, app], cb)
      }
  }, (err, results) => {
    if (err)
      return cb(err)

    return cb(null, results.user)
  })
}

const unregisterForPush = function (user_id, channel_id, app, cb) {
  if (cb === undefined) {
    cb = app
    app = 'rechat'
  }
  
  getUser(user_id).nodeify((err, user) => {
    if (err)
      return cb(err)

    db.query('notification/unregister_push', [user_id, channel_id, app], (err, res) => {
      if (err)
        return cb(err)

      return cb(null, user)
    })
  })
}

const deleteInvalidTokensForUser = async function (userID, tokenList) {
  return db.query.promise('notification/tokens/delete', [userID, tokenList])
}

const airship = new UrbanAirshipPush(config.airship)

const sendToDevice = function (notification_user, notification, channel_id, user_id, cb) {

  const alert = emojify.replace(notification_user.push_message)

  const pushInfo = {
    audience: {
      ios_channel: channel_id
    },
    notification: {
      ios: {
        alert,
        title: notification.title || '',
        sound: (notification.sound === 'silent') ? '' : 'default',
        badge: notification.badge_count,
        extra: {
          notification_id: notification.notification_id,
          object_type: notification.object_class,
          recommendation_id: notification.recommendation
        }
      }
    },
    device_types: ['ios']
  }

  // Context.log('<- (Airship-Transport) Sending payload to', channel_id, ':', pushInfo)

  airship.push.send(pushInfo, (err, data) => {
    if (err) {
      Context.log('<- (Airship-Transport) Error sending push notification to'.red, channel_id, ':', err)
      return cb()
    }

    Context.log('<- (Airship-Transport) Successfully sent a push notification to device'.green, channel_id)

    return cb(null, data)
  })
}

module.exports = {
  getAppBadgeForUser,
  getDeviceTokensForUser,
  registerForPush,
  unregisterForPush,
  sendToDevice
}
