const snake = require('to-snake-case')
const _u = require('underscore')
const render = require('../../utils/render').text
const Context = require('../Context')
const db = require('../../utils/db.js')
const async = require('async')
const Orm = require('../Orm/index')
const { insert } = require('./insert')
const Socket = require('../Socket')

const emitter = require('./emitter')

const {
  getAll: getAllUsers
} = require('../User/get')

const {
  getStatus: getUserStatus
} = require('../User/status')

const {
  BACKGROUND,
  OFFLINE
} = require('../User/constants')

const {
  get: getRoom
} = require('../Room/get')

const {
  getBranchLink: getRoomBranchLink
} = require('../Room/branch')

const decorators = []
const addDecorator = fn => decorators.push(fn)

const {
  TRANSPORT_NONE,
  TRANSPORT_PUSH,
  TRANSPORT_SMS
} = require('./constants')

const {
  getBranchLink,
  getBranchType
} = require('./branch')

const {
  getType
} = require('./get')

const {
  send: sendNotification
} = require('./send')

const sms_list = new Set([
  'UserCreatedAlert',
  'UserEditedAlert',
  'UserSharedListing',
  'UserSentMessage',
  'UserInvitedRoom',
  'ListingStatusChanged',
  'ContactCreatedShowingAppointment',
  'ContactCanceledShowingAppointment',
  'ContactRescheduledShowingAppointment',
  'ContactGaveFeedbackForShowingAppointment',
  'ShowingRoleCanceledShowingAppointment',
  'ShowingRoleConfirmedShowingAppointment',
  'ShowingRoleRejectedShowingAppointment',
  'ContactConfirmedShowingAppointment',
])


const getFormattedForLogs = function (notification) {
  const subject_class = notification.subject_class
  const action = notification.action
  const object_class = notification.object_class

  return ((subject_class ? subject_class.yellow : 'None') + '::' +
         (action ? action.yellow : 'None') + '::' +
         (object_class ? object_class.yellow : 'None'))
}

const insertForUser = function ({notification, user, room}, cb) {
  const type = getType(notification)

  const sms_enabled = sms_list.has(type)

  const branch = cb => {
    if (!sms_enabled)
      return cb()

    if(!room)
      return cb()

    if (getBranchType(notification) === 'Room')
      return getRoomBranchLink({
        user_id: user.id,
        room_id: room.id
      }, cb)

    getBranchLink(notification, user, room.id, cb)
  }

  const sms = (cb, results) => {
    if (!sms_enabled)
      return cb()

    formatForDisplay({
      notification: {
        ...notification,
        branch: results.branch
      },
      user,
      room,
      transport: TRANSPORT_SMS
    }, cb)
  }

  const push = cb => {
    formatForDisplay({
      notification,
      user,
      room,
      transport: TRANSPORT_PUSH
    }, cb)
  }

  const normal = cb => {
    formatForDisplay({
      notification,
      user,
      room,
      transport: TRANSPORT_NONE
    }, cb)
  }

  const insert = (cb, results) => {
    db.query('notification/insert_user', [
      notification.id,
      user.id,
      results.sms,
      results.push,
      results.normal
    ], cb)
  }

  async.auto({
    branch,
    sms: ['branch', sms],
    push,
    normal,
    insert: ['sms', 'push', 'normal', insert]
  }, (err, results) => {
    if (err)
      return cb(err)

    cb(null, results.insert.rows[0])
  })
}

const formatForDisplay = function({notification, user, room, transport}, cb) {
  const file = snake(getType(notification))
  notification.target_user = user
  const template = __dirname + '/../../templates/notifications/' +
                   snake(notification.object_class) + '/' +
                   file + '.tmpl'

  const data = _u.clone(notification)
  data.target_user = user
  data.room = room
  data.transport = transport

  render(template, data, (err, message) => {
    if(err)
      return cb(err)

    cb(null, message
      .replace(/\n/g, '')
      .replace(/<br>/ig, '\n')
      .trim()
    )
  })
}

const create = function (notification, cb) {
  const getUsers = (cb, results) => {
    if (notification.specific) {
      Context.log('>>> (Notification::create::getUsers) Issuing for user:', notification.specific)
      return getAllUsers([notification.specific]).nodeify(cb)
    }

    if (notification.room) {
      Context.log('>>> (Notification::create::getUsers) Issuing for room:', notification.room)
      return getAllUsers(results.room.users).nodeify(cb)
    }

    return cb(null, [])
  }

  const push = (user, results, cb) => {
    const populated = results.populated

    const airship = _u.clone(populated)
    airship.notification_id = populated.id
    airship.recommendation = populated.recommendation ? populated.recommendation.id : null

    const send = notification_user => {
      if (!airship.message && notification_user)
        airship.message = notification_user.message

      // eslint-disable-next-line
      Socket.send('Notification', user.id, [airship], (err) => {
        // notification.exclude only excludes people from sms/push. Not socket. So we send socket anyways.
        // However, if he is the exclude user, we dont have to bother anymore.
        if (_u.contains(notification.exclude, user.id))
          return cb()

        getUserStatus(user, (err, status) => {
          // If user is Online, we will not send a push notification.
          // We will give user a little while because he probably has got in-app notifications
          // If user doesnt read the notification,
          // in a little while, Notification.sendPushForUnread will pick this up and send push notification
          // However, if he is Offline or Background, we must notify him immediately.

          Context.log('► (Socket-Transport) signaled via socket'.cyan,
            getFormattedForLogs(notification),
            'for user', user.id,
            'with status', status,
            'on room', '#' + (results.room ? results.room.proposed_title : 'N/A'.red),
            ('(' + (results.room ? results.room.id : 'N/A') + ')').blue)

          if (err || status === BACKGROUND || status === OFFLINE)
            return sendNotification({
              notification_user,
              user,
              notification: airship,
              room: results.room
            }, cb)

          return cb()
        })
      })
    }

    if (_u.contains(notification.exclude, user.id))
      return send()

    insertForUser({
      notification: populated,
      user,
      room: results.room
    }, (err, notification_user) => {
      if (err)
        return cb(err)

      send(notification_user)
    })
  }

  const pushToAll = (cb, results) => {
    Context.log('>>> (Notification::create::pushToAll) Sending push to users:', results.users.map(u => u.id))
    async.map(results.users, (user, cb) => push(user, results, cb), cb)
  }

  const done = (err, results) => {
    if (err)
      return cb(err)

    return cb(err, results.saved)
  }

  const _getRoom = (notification, cb) => {
    if (!notification.room)
      return cb()

    return getRoom(notification.room, cb)
  }

  const _decorate = async ({notification, room}) => {
    for(const decorator of decorators)
      await decorator({notification, room})
  }

  const decorate = (cb, results) => {
    _decorate({
      notification,
      room: results.room
    }).nodeify(cb)
  }

  async.auto({
    room: cb => _getRoom(notification, cb),
    decorate: [
      'room',
      decorate
    ],
    saved: [
      'decorate',
      cb => {
        insert(notification, cb)
      }
    ],
    populated: [
      'saved',
      (cb, results) => {
        Orm.populate({
          models: [results.saved],
          enabled: [
            'notification.objects',
            'notification.subjects',
            'notification.auxiliary_object',
            'notification.auxiliary_subject',
          ]
        }).nodeify((err, res) => {
          if (err) {
            return cb(err)
          }

          cb(undefined, res[0])
        })
      }
    ],
    message: [
      'saved',
      'populated',
      'room',
      (cb, results ) => {
        formatForDisplay({
          notification: results.populated,
          transport: TRANSPORT_NONE,
          room: results.room
        }, cb)
      }
    ],
    users: [
      'room',
      getUsers
    ],
    send: [
      'saved',
      'populated',
      'users',
      'room',
      pushToAll
    ],
    log: [
      'saved',
      (cb, results) => {

        Context.log('<- (Notification-Driver) Successfully created a notification with id:'.grey, results.saved.id, getFormattedForLogs(results.saved))

        const listeners = emitter.listeners('create')
        const promises = listeners.map(listener => {
          return listener(results.saved)
        })
        Promise.all(promises).nodeify(cb)
      }
    ]
  }, done)
}

module.exports = {
  create,
  addDecorator,
}
