const emojify = require('emojify.js')
const async = require('async')
const db = require('../../utils/db.js')
const promisify = require('../../utils/promisify')
const { peanar } = require('../../utils/peanar')
const Context = require('../Context')
const airship = require('./airship')
const onesignal = require('./onesignal')
const { strict: assert } = require('assert')
const config = require('../../config')
const isPlainObject = require('lodash/isPlainObject')


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

const getDeviceTokensForUser = function (userId, app, cb) {
  const appConfig = config.push[app]
  
  assert(isPlainObject(appConfig), `Invalid app: ${app}`)

  const fn = {
    onesignal: getOneSignalDeviceTokensForUser,
    airship: getAirshipDeviceTokensForUser,
  }[appConfig.service]

  assert.equal(typeof fn, 'function', `Invalid push service: ${appConfig.service}`)

  return fn(userId, app, cb)
}

const getOneSignalDeviceTokensForUser = function (userId, app, cb) {
  return (async () => {
    const user = await getUser(userId) // eslint-disable-line no-unused-vars
    const res = await db.query.promise('notification/user_channels', [userId])

    // FIXME: is there a better idea to expire/blacklist old stale tokens?
    const invalidTokens = []
    const staleTokens = [] // eslint-disable-line no-unused-vars
    const tokens = []

    const promises = res.rows
      .map(r => r.channel)
      .map(ch => onesignal.getChannelInfo(app, ch).then(
        info => {
          if (!info?.invalid_identifier || !info?.last_active) {
            return invalidTokens.push(ch)
          }

          const MAX_ACTIVE_AGE = 5 * 60
          const now = Math.floor(Date.now() / 1000)
          if (now - info.last_active > MAX_ACTIVE_AGE) {
            return staleTokens.push(ch)
          }

          tokens.push(ch)
        },
        () => invalidTokens.push(ch)
      ))

    await Promise.all(promises).catch(err => Context.log(err))

    // TODO: remove such debug `Context.logs`s
    Context.log(`getOneSignalDeviceTokensForUser - UserID=${userId} Tokens=${tokens.join(',')} InvalidTokens=${invalidTokens.join(',')} StaleTokens=${staleTokens.join(',')}`)
    
    if (invalidTokens.length) {
      await deleteInvalidTokensForUser(userId, invalidTokens).catch(err => {
        Context.log(
          'Error deleting invalid tokens from notifications_tokens for user: %s\n', userId, err
        )
      })
    }

    return tokens
  })().nodeify(cb)
}

const getAirshipDeviceTokensForUser = function (user_id, app, cb) {
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
          airship.isTokenValid(app, r.channel).nodeify((err, result) => {
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
  assert.equal(typeof app, 'string', 'app must be string')
  
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
  assert.equal(typeof app, 'string', 'app must be string')
  
  if (typeof app !== 'string') {
    return cb(Error.Validation('app must be string'))
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

// const airship = new UrbanAirshipPush(config.push.rechat.config)

const _sendToDevice = function (notificationUser, notification, channelId, userId, cb) {
  const appConfig = config.push[notification.app]
  
  assert(isPlainObject(appConfig), `Invalid app: ${notification.app}`)

  const sendFn = {
    onesignal: sendToOneSignal,
    airship: sendToAirship
  }[appConfig.service]

  assert.equal(typeof sendFn, 'function', `Invalid push service: ${appConfig.service}`)

  if (appConfig.androidChannelId) {
    notification.android_channel_id = appConfig.androidChannelId
  }

  return sendFn(notificationUser, notification, channelId, userId, cb)
}

const sendToDevice = peanar.job({
  handler: promisify(_sendToDevice),
  name: 'send_to_device',
  queue: 'send_to_device',
  exchange: 'notifications',
  max_retries: 50,
  retry_exchange: 'notifications.retry',
  error_exchange: 'notifications.error'
})

const sendToOneSignal = function (notificationUser, notification, channelId, userId, cb) {
  const alert = emojify.replace(notificationUser.push_message) // eslint-disable-line no-unused-vars

  const sound = notification.sound === 'silent' ? null : 'default'

  /* TODO: WIP... */
  const options = {
    include_player_ids: [channelId],
    contents: { en: alert },
    headings: { en: notification.title || '' },
    subtitle: { en: notification.title || '' },
    data: {
      notification_id: notification.notification_id,
      object_type: notification.object_class,
      recommendation_id: notification.recommendation,
    },
    // app_id: '',
    // url: 'https://rechat.com',

    ios_sound: sound,
    android_sound: sound,
    huawei_sound: sound,
    
    ios_badgeType: 'SetTo',
    ios_badgeCount: notification.badge_count,
  }

  if (notification.android_channel_id) {
    options.android_channel_id = notification.android_channel_id
    options.huawei_channel_id = notification.android_channel_id
  }

  onesignal.send(notification.app, options)
    .then(data => {
      Context.log('<- (OneSignal-Transport) Successfully sent a push notification to device'.green, channelId)
      cb(null, data)
    })
    .catch(err => {
      Context.log('<- (OneSignal-Transport) Error sending push notification to'.red, channelId, ':', err)
      cb()
    })
}

const sendToAirship = function (notification_user, notification, channel_id, user_id, cb) {
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

  airship.send(notification.app, pushInfo)
    .then(data => {
      Context.log('<- (Airship-Transport) Successfully sent a push notification to device'.green, notification.id, channel_id)

      cb(null, data)      
    })
    .catch(err => {
      Context.log('<- (Airship-Transport) Error sending push notification to'.red, notification.id, channel_id, ':', err)
      cb(err)
    })
}

module.exports = {
  getAppBadgeForUser,
  getDeviceTokensForUser,
  registerForPush,
  unregisterForPush,
  sendToDevice
}
