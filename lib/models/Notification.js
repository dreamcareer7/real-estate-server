/**
 * @namespace Notification
 */

const async = require('async')
const _u = require('underscore')
const UrbanAirshipPush = require('urban-airship-push')
const EventEmitter = require('events').EventEmitter
const debug = require('debug')('rechat:notifications')
const validator = require('../utils/validator.js')
const db = require('../utils/db.js')
const config = require('../config.js')
const snake = require('to-snake-case')

Notification = new EventEmitter()

Orm.register('notification', 'Notification')

Notification.object_enum = [
  'Recommendation',
  'Listing',
  'Message',
  'Comment',
  'Room',
  'HotSheet',
  'Photo',
  'Video',
  'Document',
  'Tour',
  'Co-Shopper',
  'Price',
  'Status',
  'User',
  'Alert',
  'Invitation',
  'Contact',
  'Attachment',
  'CMA',
  'OpenHouse',
  'Envelope',
  'EnvelopeRecipient'
]

Notification.action_enum = [
  'Liked',
  'Composed',
  'Edited',
  'Added',
  'Removed',
  'Posted',
  'Favorited',
  'Changed',
  'Created',
  'CreatedFor',
  'Shared',
  'Arrived',
  'Toured',
  'Accepted',
  'Declined',
  'Joined',
  'Left',
  'Archived',
  'Deleted',
  'Opened',
  'Closed',
  'Pinned',
  'Sent',
  'Invited',
  'BecameAvailable',
  'PriceDropped',
  'StatusChanged',
  'TourRequested',
  'IsDue',
  'Assigned',
  'Withdrew',
  'Attached',
  'Detached',
  'Available',
  'ReactedTo'
]

const schema = {
  type: 'object',
  properties: {
    action: {
      type: 'string',
      enum: Notification.action_enum,
      required: true
    },

    object_class: {
      type: 'string',
      enum: Notification.object_enum,
      required: true
    },

    subject_class: {
      type: 'string',
      enum: Notification.object_enum,
      required: true
    },

    message: {
      type: 'string',
      required: true
    },

    image_url: {
      type: 'string',
      required: false
    },

    notified_user: {
      type: 'string',
      uuid: true,
      required: false
    },

    object: {
      type: 'string',
      uuid: true,
      required: true
    },

    subject: {
      type: 'string',
      uuid: true,
      required: true
    },

    room: {
      type: 'string',
      uuid: true,
      required: false
    },

    auxiliary_object: {
      type: 'string',
      uuid: true,
      required: false
    },

    auxiliary_object_class: {
      type: 'string',
      enum: Notification.object_enum,
      required: false
    },

    auxiliary_subject: {
      type: 'string',
      uuid: true,
      required: false
    },

    auxiliary_subject_class: {
      type: 'string',
      enum: Notification.object_enum,
      required: false
    },

    recommendation: {
      type: 'string',
      uuid: true,
      required: false
    }
  }
}

Notification.TRANSPORT_SMS = 'SMS'
Notification.TRANSPORT_EMAIL = 'Email'
Notification.TRANSPORT_PUSH = 'Push'
Notification.TRANSPORT_NONE = 'None'

const validate = validator.bind(null, schema)

function create (notification, cb) {
  validate(notification, err => {
    if (err)
      return cb(err)

    db.query('notification/insert', [
      notification.action,
      notification.object_class,
      notification.object,
      notification.subject,
      notification.message,
      notification.auxiliary_object_class,
      notification.auxiliary_object,
      notification.recommendation,
      notification.room,
      notification.auxiliary_subject,
      notification.subject_class,
      notification.auxiliary_subject_class,
      notification.extra_object_class,
      notification.extra_subject_class,
      notification.exclude,
      notification.specific
    ], function (err, res) {
      if (err)
        return cb(err)

      Notification.get(res.rows[0].id, (err, notification) => {
        if (err)
          return cb(err)

        cb(null, notification)
      })
    })
  })
}

Notification.get = function (id, cb) {
  Notification.getAll([id], (err, notifications) => {
    if(err)
      return cb(err)

    if (notifications.length < 1)
      return cb(Error.ResourceNotFound(`Notification ${id} not found`))

    const notification = notifications[0]

    return cb(null, notification)
  })
}

Notification.getAll = function(notification_ids, cb) {
  const user_id = ObjectUtil.getCurrentUser()

  db.query('notification/get', [notification_ids, user_id], (err, res) => {
    if (err)
      return cb(err)

    const notifications = res.rows

    return cb(null, notifications)
  })
}

Notification.schedule = function (notification, cb) {
  if (!notification.delay)
    notification.delay = 0

  const job = Job.queue.create('create_notification', {
    notification: notification
  })
  .removeOnComplete(true)
  .delay(notification.delay)
  .attempts(1)
  .backoff({type: 'exponential'})

  process.domain.jobs.push(job)
  return cb(null, {})
}

const insertForUser = function (notification_id, user_id, cb) {
  db.query('notification/insert_user', [notification_id, user_id], cb)
}

Notification.create = function (notification, cb) {
  const getUsers = (cb, results) => {
    if (notification.specific) {
      debug('>>> (Notification::create::getUsers) Issuing for user:', notification.specific)
      return cb(null, [notification.specific])
    }

    if (notification.room) {
      debug('>>> (Notification::create::getUsers) Issuing for room:', notification.room)
      return cb(null, results.room.users)
    }

    return cb(null, [])
  }

  const push = (user_id, results, cb) => {
    const populated = results.populated

    const airship = _u.clone(populated)
    airship.notification_id = populated.id
    airship.recommendation = populated.recommendation ? populated.recommendation.id : null

    const send = () => {
      // eslint-disable-next-line
      Socket.send('Notification', user_id, [airship], (err) => {
        // notification.exclude only excludes people from sms/push. Not socket. So we send socket anyways.
        // However, if he is the exclude user, we dont have to bother anymore.
        if (user_id === notification.exclude)
          return cb()

        User.getStatus(user_id, (err, status) => {
          // If user is Online, we will not send a push notification.
          // We will give user a little while because he probably has got in-app notifications
          // If user doesnt read the notification,
          // in a little while, Notification.sendPushForUnread will pick this up and send push notification
          // However, if he is Offline or Background, we must notify him immediately.

          console.log('► (Socket-Transport) signaled via socket'.cyan,
                        Notification.getFormattedForLogs(notification),
                        'for user', user_id,
                        'with status', status,
                        'on room', '#' + (results.room ? results.room.proposed_title : 'N/A'.red),
                        ('(' + (results.room ? results.room.id : 'N/A') + ')').blue)

          if (err || status === User.BACKGROUND || status === User.OFFLINE)
            return Notification.send(user_id, notification.room, airship, cb)

          return cb()
        })
      })
    }

    if (user_id === notification.exclude)
      return send()

    insertForUser(populated.id, user_id, (err) => {
      if (err)
        return cb(err)

      send()
    })
  }

  const pushToAll = (cb, results) => {
    debug('>>> (Notification::create::pushToAll) Sending push to users:', results.users)
    async.map(results.users, (user_id, cb) => push(user_id, results, cb), cb)
  }

  const sendViewMessage = (cb, results) => {
    if (!results.room) {
      debug('>>> (Notification::create::sendViewMessage) NOT A ROOM')
      return cb()
    }

    if (notification.action === 'Sent') {
      debug('>>> (Notification::create::sendViewMessage) No need to create a NotifcationViewMessage for a Message')
      return cb()
    }

    const message = {}

    message.message_type = 'TopLevel'
    message.comment = results.message
    message.notification = results.saved.id
    message.recommendation = notification.recommendation

    debug('>>> (Notification::create::sendViewMessage) Issuing NotificationViewMessage for room:', notification.room, 'Message:', JSON.stringify(message))
    return Message.post(notification.room, message, false, cb)
  }

  const done = (err, results) => {
    if (err)
      return cb(err)

    return cb(err, results.saved)
  }

  const getRoom = (notification, cb) => {
    if (!notification.room)
      return cb()

    return Room.get(notification.room, cb)
  }

  async.auto({
    room: cb => getRoom(notification, cb),
    saved: [
      'room',
      cb => {
        create(notification, cb)
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
          cb(err, res[0])
        })
      }
    ],
    message: [
      'saved',
      'populated',
      (cb, results ) => {
        Notification.formatForDisplay(results.populated, results.populated, Notification.TRANSPORT_NONE, cb)
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
      pushToAll
    ],
    view_message: [
      'room',
      'saved',
      'message',
      sendViewMessage
    ],
    log: [
      'saved',
      (cb, results) => {
        console.log('<- (Notification-Driver) Successfully created a notification with id:'.grey, results.saved.id, Notification.getFormattedForLogs(results.saved))
        return cb()
      }
    ]
  }, done)
}

Notification.getDeviceTokensForUser = function (user_id, cb) {
  User.get(user_id, (err, user) => {
    if (err)
      return cb(err)

    db.query('notification/device_tokens', [user_id], (err, res) => {
      if (err)
        return cb(err)

      const tokens = res.rows.map(r => {
        return r.device_token
      })

      debug('>>> (Notification::getDeviceTokensForUser)', '#', user.id, user.first_name, user.last_name, ('(' + user.email + ')'), '=>', tokens)
      return cb(null, tokens)
    })
  })
}

Notification.getForUser = function (user_id, paging, cb) {
  User.get(user_id, (err, user) => {
    if (err)
      return cb(err)

    db.query('notification/user', [
      user_id,
      paging.type,
      paging.timestamp,
      paging.limit
    ], (err, res) => {
      if (err)
        return cb(err)

      if (res.rows.length < 1)
        return cb(null, [])

      const notification_ids = res.rows.map(r => {
        return r.id
      })

      Notification.getAll(notification_ids, (err, notifications) => {
        if (err)
          return cb(err)

        if (res.rows.length > 0) {
          notifications[0].total = res.rows[0].total
          notifications[0].new = res.rows[0].new
        }

        return cb(null, notifications)
      })
    })
  })
}

Notification.ack = function (user_id, notification_id, cb) {
  Notification.get(notification_id, (err, notification) => {
    if (err)
      return cb(err)

    db.query('notification/ack', [user_id, notification_id], (err, res) => {
      if (err)
        return cb(err)

      if(!notification.room)
        return cb(null, notification)

      Socket.send('Notification.Acknowledged', notification.room, [{
        notification: notification,
        user: user_id
      }])

      return cb(null, notification)
    })
  })
}

Notification.ackRoom = function (user_id, room_id, cb) {
  async.auto({
    user: cb => {
      User.get(user_id, cb)
    },
    room: cb => {
      Room.get(room_id, cb)
    },
    ack: [
      'user',
      'room',
      cb => {
        db.query('notification/ack_room', [user_id, room_id], cb)
      }
    ],
    socket: [
      'ack',
      cb => {
        Socket.send('Room.Acknowledged', room_id, [{
          room: room_id,
          user: user_id
        }])

        cb()
      }
    ]
  }, cb)
}

Notification.ackPersonal = function (user_id, cb) {
  async.auto({
    user: cb => {
      User.get(user_id, cb)
    },
    ack: [
      'user',
      cb => {
        db.query('notification/ack_personal', [user_id], cb)
      }
    ]
    // FIXME: probably needs a socket event
    // socket: [
    //   'ack',
    //   cb => {
    //     Socket.send('Room.Acknowledged', room_id, [{
    //       room: room_id,
    //       user: user_id
    //     }])
    //   }
    // ]
  }, cb)
}

Notification.patchSeen = function (user_id, notification_id, cb) {
  async.auto({
    user: cb => {
      User.get(user_id, cb)
    },
    seen: [
      'user',
      cb => {
        db.query('notification/patch_seen', [user_id, notification_id], cb)
      }
    ]
  }, cb)
}

Notification.issueForRoom = function (notification, cb) {
  debug('>>> (Notification::issueForRoom)', 'Notification Object:', JSON.stringify(notification))
  return Notification.schedule(notification, cb)
}

Notification.issueForRoomExcept = function (notification, user_id, cb) {
  debug('>>> (Notification::issueForRoomExcept)', 'Notification Object:', JSON.stringify(notification), 'Except:', user_id)
  notification.exclude = user_id
  return Notification.schedule(notification, cb)
}

Notification.issueForUser = function (notification, user_id, cb) {
  debug('>>> (Notification::issueForUser)', 'Notification Object:', JSON.stringify(notification), 'Specific:', user_id)
  notification.specific = user_id
  return Notification.schedule(notification, cb)
}

Notification.issueForUsers = function (notification, users, overrides, cb) {
  debug('>>> (Notification::issueForUsers)', 'Notification Object:', JSON.stringify(notification), 'For users:', users)
  async.map(users, (r, cb) => {
    let n = _u.clone(notification)
    n.specific = r
    n = Notification.override(n, overrides, r)

    return Notification.schedule(n, cb)
  }, (err, results) => {
    if (err)
      return cb(err)

    return cb(null, results)
  })
}

Notification.issueForUsersExcept = function (notification, users, user_id, overrides, cb) {
  debug('>>> (Notification::issueForUsersExcept)', 'Notification Object:', JSON.stringify(notification), 'For users:', users)
  async.map(users, (r, cb) => {
    if (r === user_id)
      return cb()

    let n = _u.clone(notification)
    n.specific = r
    n = Notification.override(n, overrides, r)

    return Notification.schedule(n, cb)
  }, (err, results) => {
    if (err)
      return cb(err)

    return cb(null, results)
  })
}

Notification.override = function (notification, overrides, entity) {
  if (overrides.subject)
    notification.subject = entity

  if (overrides.object)
    notification.object = entity

  return notification
}

Notification.registerForPush = function (user_id, device, token, cb) {
  if (!token)
    return cb(Error.Validation('Token cannot be null'))

  if (!device)
    return cb(Error.Validation('Device ID cannot be null'))

  async.auto({
    user: cb => {
      return User.get(user_id, cb)
    },
    register: [
      cb => {
        db.query('notification/register_push', [user_id, device, token], cb)
      }
    ]
  }, (err, results) => {
    if (err)
      return cb(err)

    return cb(null, results.user)
  })
}

Notification.unregisterForPush = function (user_id, token, cb) {
  User.get(user_id, function (err, user) {
    if (err)
      return cb(err)

    db.query('notification/unregister_push', [user_id, token], function (err, res) {
      if (err)
        return cb(err)

      return cb(null, user)
    })
  })
}

Notification.publicize = function (model) {
  if (model.total) delete model.total
  if (model.exclude) delete model.exclude
  if (model.specific) delete model.specific

  return model
}

const airship = new UrbanAirshipPush(config.airship)

Notification.sendToDevice = function (notification, token, user_id, cb) {
  const pushInfo = {
    audience: {
      device_token: token
    },
    notification: {
      ios: {
        alert: notification.message,
        sound: 'default',
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

  airship.push.send(pushInfo, (err, data) => {
    if (err) {
      console.log('<- (Airship-Transport) Error sending push notification to'.red, token, ':', err)
      return cb()
    }

    console.log('<- (Airship-Transport) Successfully sent a push notification to device'.green, token)
    cb(null, data)
  })
}

Notification.saveDelivery = function(nid, u, token, type, cb) {
  Notification.get(nid, (err, n) => {
    if(err)
      return cb(err)

    db.query('notification/insert_delivery', [n.id, u, token, type], err => {
      if(err)
        return cb(err)

      if(!n.room)
        return cb()

      Socket.send('Notification.Delivered', n.room, [{
        notification: n,
        user: u,
        delivery_type: type
      }])

      return cb()
    })
  })
}

Notification.getUnreadForRoom = function (user_id, room_id, cb) {
  db.query('notification/unread_room', [user_id, room_id], (err, res) => {
    if (err)
      return cb(err)

    cb(null, res.rows)
  })
}

Notification.getAppBadgeForUser = function (user_id, cb) {
  db.query('notification/app_badge', [user_id], (err, res) => {
    if (err)
      return cb(err)

    cb(null, res.rows[0].app_badge)
  })
}

Notification.sendForUnread = function (cb) {
  const sendSingle = (payload, cb) => {
    Notification.get(payload.notification, (err, notification) => {
      if (err)
        return cb(err)

      Orm.populate({models: [notification]}).nodeify((err, populated) => {
        if (err)
          return cb(err)

        const clone = _u.clone(populated[0])
        clone.notification_id = notification.id
        clone.recommendation = populated[0].recommendation ? populated[0].recommendation.id : null

        Notification.send(payload.user, notification.room, clone, cb)
      })
    })
  }

  db.query('notification/unread', [], (err, res) => {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb()

    async.map(res.rows, (set, cb) => {
      async.map(set.notifications, (n, cb) => {
        sendSingle({
          notification: n,
          user: set.user
        }, cb)
      }, cb)
    }, cb)
  })
}

const sendAsPush = function(notification, user, room, tokens, delay, cb) {
  async.auto({
    summary: (cb, results) => {
      Notification.getAppBadgeForUser(user.id, (err, count) => {
        if(err)
          return cb(err)

        notification.badge_count = _u.isEmpty(count) ? 0 : parseInt(count)
        return cb()
      })
    },
    message: (cb, results) => {
      const data = _u.clone(notification)
      data.target_user = user
      data.room = room

      Notification.formatForDisplay(notification, notification, Notification.TRANSPORT_PUSH, (err, message) => {
        if(err)
          return cb(err)

        notification.badge_count =
        notification.message = message
        return cb(null, message)
      })
    },
    send: [
      'message',
      'summary',
      (cb, results) => {
        async.map(tokens, (token, cb) => {
          Notification.saveDelivery(notification.notification_id, user.id, token, 'airship', (err) => {
            if (err)
              return cb(err)

            const job = Job.queue.create('airship_transport_send_device', {
              notification: notification,
              token: token,
              user_id: user.id
            }).removeOnComplete(true)

            if (delay > 0)
              job.delay(delay)

            debug('>>> (Notification::send) Job pushed to domain for user:', User.getDisplayName(user), 'on room:', (room ? room.proposed_title : 'N/A'),
                  'notification:', Notification.getFormattedForLogs(notification))
            process.domain.jobs.push(job)
            console.log('⇪ (Airship-Transport) scheduled a notification'.green,
                        Notification.getFormattedForLogs(notification),
                        'for user', User.getFormattedForLogs(user),
                        'on room', (room ? room.proposed_title : 'N/A'.red),
                        ('(' + (room ? room.id : 'N/A') + ')').blue,
                        ('delay +' + delay).red, 'token:', token.yellow)

            return cb()
          })
        }, cb)
      }
    ]
  }, cb)
}

const sendAsText = function(notification, user, room, delay, cb) {
  const branch = (cb, results) => {
    if(!room)
      return cb()

    if (Notification.branchType(notification) === 'Room')
      return Room.getBranchLink({
        user_id: user.id,
        room_id: room.id
      }, cb)

    Notification.getBranchLink(results.notification, user, room.id, cb)
  }

  const saveDelivery = (cb, results) => {
    Notification.saveDelivery(results.notification.id, user.id, user.phone_number, 'sms', cb)
  }

  const getMessage = (cb, results) => {
    const data = _u.clone(notification)
    data.target_user = user
    data.room = room
    data.branch = results.branch

    Notification.formatForDisplay(notification, data, Notification.TRANSPORT_SMS, (err, message) => {
      if(err)
        return cb(err)

      notification.message = message
      return cb(null, message)
    })
  }

  const send = (cb, results) => {
    if (!results.from) {
      console.log('NO PHONE NUMBER ASSOCIATED WITH USER:', user.id, 'ON ROOM:', room)
      return cb()
    }

    // We have not yet implemented this correctly
    if (!room)
      return cb()

    const text = {
      to: user.phone_number,
      from: results.from,
      body: notification.message
    }

    if (results.photo)
      text.image = results.photo

    SMS.send(text, cb)
  }

  const resolvePhoneNumber = (cb, results) => {
    if (!room)
      return cb(null, config.twilio.from)

    Room.resolvePhoneForSeamless(user.id, room.id, cb)
  }

  const report = (err) => {
    if (!err)
      return cb()

    if (err.http === 501)
      return cb()

    return cb(err)
  }

  const resolvePhoto = (cb, results) => {
    if (notification.notification_type === 'UserSentMessage') {
      const message = notification.objects[0]

      if (!message || !message.attachments || !(message.attachments.length > 0))
        return cb()

      const attachment = message.attachments[0]
      return cb(null, attachment.preview_url)
    }

    if (notification.notification_type === 'UserSharedListing') {
      return cb(null, notification.objects[0].cover_image_url)
    }

    cb()
  }

  async.auto({
    notification: cb => Notification.get(notification.notification_id, cb), // We already have a fully populated one?
    from: ['notification', resolvePhoneNumber],
    branch: ['notification', branch],
    delivery: ['notification', 'branch', saveDelivery],
    message: ['branch', getMessage],
    photo: ['notification', resolvePhoto],
    send: ['from', 'delivery', 'message', send]
  }, report)
}

Notification.send = function (user_id, room_id, notification, cb) {
  const send = (cb, results) => {
    let delay = 0

    if (!Notification.isSystemGenerated(notification)) {
      debug('>>> (Notification::send) User-generated notification:',
            Notification.getFormattedForLogs(notification),
            'scheduling now for user:', user_id, 'on room:', room_id)
      delay = 0
    }
    else {
      delay = (results.user_ok_for_push < 0) ? 0 : results.user_ok_for_push
      debug('>>> (Notification::send) System-generated notification:',
            Notification.getFormattedForLogs(notification),
            'scheduling in', delay, 'for user:', user_id, 'on room:', room_id)
    }

    if (!results.room_ok_for_push && Notification.isSystemGenerated(notification)) {
      debug('>>> (Notification::send) Room is muted. Not sending System-generated notification:',
            Notification.getFormattedForLogs(notification),
            'for user:', user_id, 'on room:', room_id)
      return cb()
    }

    if (results.transport === Notification.TRANSPORT_PUSH)
      return sendAsPush(notification, results.user, results.room, results.tokens, delay, cb)

    else if (results.transport === Notification.TRANSPORT_SMS)
      return sendAsText(notification, results.user, results.room, delay, cb)

    return cb()
  }

  const getRoom = (room_id, cb) => {
    if (!room_id)
      return cb()

    return Room.get(room_id, cb)
  }

  const roomOkForPush = (user_id, room_id, cb) => {
    if (!room_id)
      return cb(null, true)

    return Room.isPushOK(user_id, room_id, cb)
  }

  const transport = (cb, results) => {
    if (!_u.isEmpty(results.tokens))
      return cb(null, Notification.TRANSPORT_PUSH)

    if (_u.isEmpty(results.tokens) && User.shouldTrySMS(results.user))
      return cb(null, Notification.TRANSPORT_SMS)

    return cb(null, Notification.TRANSPORT_NONE)
  }

  async.auto({
    user: User.get.bind(null, user_id),
    room: (cb) => getRoom(room_id, cb),
    tokens: ['user', Notification.getDeviceTokensForUser.bind(null, user_id)],
    user_ok_for_push: ['user', User.isPushOK.bind(null, user_id)],
    room_ok_for_push: ['user', 'room', (cb, results) => roomOkForPush(user_id, room_id, cb)],
    transport: ['user', 'tokens', transport],
    send: [
      'user',
      'room',
      'tokens',
      'user_ok_for_push',
      'room_ok_for_push',
      'transport',
      send
    ]
  }, cb)
}

Notification.getFormattedForLogs = function (notification) {
  const subject_class = notification.subject_class
  const action = notification.action
  const object_class = notification.object_class

  return ((subject_class ? subject_class.yellow : 'None') + '::' +
         (action ? action.yellow : 'None') + '::' +
         (object_class ? object_class.yellow : 'None'))
}

Notification.isSystemGenerated = function (notification) {
  if (notification.action === 'BecameAvailable' ||
      notification.action === 'PriceDropped' ||
      notification.action === 'Available' ||
      notification.action === 'StatusChanged')
    return true

  return false
}

Notification.getBranchLink = function(notification, user, room_id, cb) {
  const type = Notification.type(notification)

  if(type !== 'UserCreatedAlert' && type !== 'UserSharedListing')
    return cb() // Only these three notifications have specific branch links for now

  const b = {}

  if(type === 'UserSharedListing') {
    b.listing = notification.object
    b.action = 'RedirectToListing'
  } else if (type === 'UserCreatedAlert') {
    b.alert = notification.object
    b.action = 'RedirectToAlert'
  }

  const getBrand = cb => {
    if (!user.brand)
      return cb()

    Brand.get(user.brand, cb)
  }

  getBrand((err, brand) => {
    if (err)
      return cb(err)

    const url = Url.web({
      uri: '/branch',
      brand
    })

    b.room = room_id || notification.room || undefined
    b.sending_user = notification.subject
    b.receiving_user = user.id
    b.token = user.secondary_password
    b.email = user.email

    if (user.phone_number)
      b.phone_number = user.phone_number

    b['$desktop_url'] = url
    b['$fallback_url'] = url

    Branch.createURL(b, cb)
  })
}

Notification.formatForDisplay = function(notification, data, transport, cb) {
  data.transport = transport
  const template = __dirname + '/../templates/notifications/' +
                   snake(notification.object_class) + '/' +
                   Notification.templateFile(notification) + '.tmpl'

  Template.render(template, data, (err, message) => {
    if(err)
      return cb(err)

    return cb(null, message.replace(/\n/g, '').trim())
  })
}

Notification.type = n => n.subject_class + n.action + n.object_class
Notification.branchType = n => (Notification.type(n) === 'UserCreatedAlert' || Notification.type(n) === 'UserSharedListing') ? 'Resource' : 'Room'
Notification.templateFile = n => snake(Notification.type(n))

Notification.associations = {
  recommendations: {
    collection: true,
    model: 'Recommendation',
    ids: (n, cb) => {
      if (n.recommendation)
        return cb(null, [n.recommendation])

      return cb()
    }
  },
  objects: {
    collection: true,
    model: (n, cb) => cb(null, n.object_class),
    ids: (n, cb) => {
      if (n.object_class === 'Room')
        return cb()

      if (n.object)
        return cb(null, [n.object])
      return cb()
    }
  },
  subjects: {
    collection: true,
    model: (n, cb) => cb(null, n.subject_class),
    ids: (n, cb) => {
      if (n.subject_class === 'Room' || n.subject_class === 'Message')
        return cb()

      if (n.subject)
        return cb(null, [n.subject])

      return cb()
    }
  },
  auxiliary_object: {
    optional: true,
    model: (n, cb) => cb(null, n.auxiliary_object_class),
    id: (n, cb) => {
      if (n.auxiliary_object_class === 'Room' || n.auxiliary_object_class === 'Message')
        return cb()

      return cb(null, n.auxiliary_object)
    }
  },
  auxiliary_subject: {
    optional: true,
    model: (n, cb) => cb(null, n.auxiliary_subject_class),
    id: (n, cb) => {
      if (n.auxiliary_subject_class === 'Room' || n.auxiliary_subject_class === 'Message')
        return cb()

      return cb(null, n.auxiliary_subject)
    }
  }
}

module.exports = function () {

}
