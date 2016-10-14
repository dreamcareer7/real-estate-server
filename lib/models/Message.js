/**
 * @namespace Message
 */

const db = require('../utils/db.js')
const validator = require('../utils/validator.js')
const async = require('async')
const EventEmitter = require('events').EventEmitter
const config = require('../config.js')
const request = require('request')

const sql_post = require('../sql/message/post.sql')
const sql_get = require('../sql/message/get.sql')
const sql_retrieve = require('../sql/message/retrieve.sql')
const sql_unread = require('../sql/message/unread.sql')

Message = new EventEmitter()

Orm.register('message', Message)

/**
 * * `TopLevel`: A `message` in the main thread
 * * `SubLevel`: A sublevel `message` belongs to a specific object eg. `recommendation`
 * @typedef message_type
 * @type {string}
 * @memberof Message
 * @instance
 * @enum {string}
 */

/**
 * @typedef message
 * @type {object}
 * @memberof Message
 * @instance
 * @property {uuid} id - ID of this message
 * @property {string=} comment - text content of this message if any
 * @property {string=} image_url - URL of the image attached to this message if any
 * @property {string=} document_url - URL of the document attached to this message if any
 * @property {string=} video_url - URL of the video attached to this message if any
 * @property {uuid=} object - ID of the object attached to this message if any
 * @property {uuid=} author - ID of the author of this message if it's not system generated
 * @property {timestamp} created_at - indicates when this object was created
 * @property {timestamp=} updated_at - indicates when this object was last modified
 * @property {timestamp=} deleted_at - indicates when this object was deleted
 * @property {uuid} room - ID of the room this message belongs to
 * @property {Message#message_type} message_type - type of this message. Could be `Top-Level` or `Sub-Level`
 * @property {string=} image_thumbnail_url - URL of the thumbnail image attached to this message if any
 * @property {uuid=} notification - ID of the notification object linked with this message
 */

const schema = {
  type: 'object',
  properties: {
    message_type: {
      type: 'string',
      enum: [ 'TopLevel', 'SubLevel' ],
      required: true
    },

    comment: {
      type: 'string',
      required: false
    },

    image_url: {
      type: 'string',
      required: false
    },

    image_thumbnail_url: {
      type: 'string',
      required: false
    },

    document_url: {
      type: 'string',
      required: false
    },

    video_url: {
      type: 'string',
      required: false
    },

    recommendation: {
      type: 'string',
      uuid: true,
      required: false
    },

    author: {
      type: 'string',
      uuid: true,
      required: false
    },

    mentions: {
      type: 'array',
      required: false,
      items: {
        type: 'string',
        uuid: 'true'
      }
    },

    attachments: {
      type: 'array',
      required: false,
      items: {
        type: 'string',
        uuid: true
      }
    },

    notification: {
      type: 'string',
      uuid: true,
      required: false
    }
  }
}

const validate = validator.bind(null, schema)

/**
 * Posts a `message` to a `room`
 * @name post
 * @function
 * @memberof Message
 * @instance
 * @public
 * @param {uuid} room_id - ID of the room to post this message to
 * @param {Message#message} message - full `message` object
 * @param {boolean} push - indicates whether a notification should be generated for this message or not
 * @param {callback} cb - callback function
 * @returns {Message#message}
 */
Message.post = function (room_id, message, push, cb) {
  async.auto({
    room: cb => {
      return Room.get(room_id, cb)
    },
    author: cb => {
      if (!message.author)
        return cb()

      return User.get(message.author, cb)
    },
    validate: cb => {
      return validate(message, cb)
    },
    recommendation: cb => {
      if (!message.recommendation)
        return cb()

      return Recommendation.get(message.recommendation, cb)
    },
    check_recommendation: [
      'recommendation',
      (cb, results) => {
        if (results.recommendation && results.recommendation.room !== room_id)
          return cb(Error.Validation('Cannot mention a recommendation which belongs to another room.'))

        return cb()
      }
    ],
    mentions: cb => {
      if (!message.mentions)
        return cb()

      return async.map(message.mentions, User.get, cb)
    },
    listing: [
      'recommendation',
      (cb, results) => {
        if (!message.recommendation)
          return cb()

        return Listing.get(results.recommendation.listing, cb)
      }
    ],
    users: cb => {
      return Room.getUsers(room_id, cb)
    },
    is_member: [
      'room',
      'author',
      'users',
      (cb, results) => {
        if (!Room.belongs(results.users, message.author))
          return cb(Error.Forbidden('User is not a member of this room'))

        return cb()
      }
    ],
    post: [
      'is_member',
      'validate',
      'mentions',
      'check_recommendation',
      cb => {
        db.query(sql_post, [
          room_id,
          message.message_type,
          message.comment,
          message.image_url,
          message.document_url,
          message.video_url,
          message.recommendation,
          message.reference,
          message.author,
          message.notification,
          message.mentions
        ], function (err, res) {
          if (err)
            return cb(err)

          return cb(null, res.rows[0].id)
        })
      }
    ],
    attachments: [
      'post',
      (cb, results) => {
        async.map(message.attachments, (r, cb) => {
          Attachment.get(r, err => {
            if (err)
              return cb(err)

            return Attachment.link(results.post, r, cb)
          })
        }, cb)
      }
    ],
    message: [
      'post',
      'attachments',
      (cb, results) => {
        return Message.get(results.post, cb)
      }
    ],
    push: [
      'room',
      'author',
      'recommendation',
      'validate',
      'post',
      'attachments',
      'message',
      (cb, results) => {
        Message.emit('new message', {
          message: results.message,
          room: results.room
        })

        if (!push)
          return cb()

        const room = results.room
        const message_id = results.post

        let aux = ''
        let sub_aux = ''
        const notification = {}
        const address_line = (message.recommendation) ? Address.getLocalized(results.listing.property.address) : ''

        if (message.comment) {
          aux = ' ' + message.comment
          sub_aux = 'Comment'
        }
        else if (message.image_url) {
          aux = (message.recommendation) ? (' added a photo to ' + address_line) : ' sent a photo'
          sub_aux = 'Photo'
        }
        else if (message.video_url) {
          aux = (message.recommendation) ? (' added a video to ' + address_line) : ' sent a video'
          sub_aux = 'Video'
        }
        else if (message.document_url) {
          aux = (message.recommendation) ? (' added a document to ' + address_line) : ' sent a document'
          sub_aux = 'Document'
        } else {
          sub_aux = 'Comment'
        }

        let user = {}
        user.first_name = 'Rechat'

        if (results.author)
          user = results.author

        const base_message = '#' + room.proposed_title + ': @' + user.first_name
        notification.action = 'Sent'
        notification.subject = user.id
        notification.subject_class = 'User'
        notification.object = message_id
        notification.object_class = 'Message'
        notification.auxiliary_object = room_id
        notification.auxiliary_object_class = 'Room'
        notification.message = base_message + aux
        notification.recommendation = ((message.recommendation) ? message.recommendation : undefined)
        notification.extra_object_class = (message.recommendation) ? 'Recommendation' : null
        notification.extra_subject_class = sub_aux
        notification.room = room_id

        return Notification.issueForRoomExcept(notification, user.id, cb)
      }
    ]
  }, (err, results) => {
    if (err)
      return cb(err)

    return cb(null, results.message)
  })
}

Message.postSeamless = function (incoming, cb) {
  if (incoming.domain !== config.mailgun.domain)
    return cb(Error.Forbidden('Domain is invalid'))

  const e = () => {
    return Error.NotAcceptable('Cannot determine the sender or receiver of this message')
  }

  if (!incoming['stripped-text'])
    return cb(Error.NotAcceptable('Nothing to post'))

  const to = incoming.recipient.match('(.*)@')
  if (!to || !to[1])
    return cb(e())

  let room_id, user_id, decrypted

  try {
    decrypted = JSON.parse(Crypto.decrypt(to[1]))
    room_id = decrypted.room_id
    user_id = decrypted.user_id
  } catch (err) {
    return cb(Error.NotAcceptable('Invalid reply token'))
  }

  if (!room_id || !user_id)
    return cb(e())

  const attach = (attachment, cb) => {
    const got = (err, response, body) => {
      if (err)
        return cb(err)

      const ext = attachment.name.split('.').pop()

      S3.upload('attachments', {
        attachment: true,
        ext: ext,
        info: {
          'mime-extension': ext,
          mime: attachment['content-type'],
          original_name: attachment.name
        },
        attributes: {private: true},
        body: body
      }, (err, a) => {
        if (err)
          return cb(err)

        return cb(null, a.attachment.id)
      })
    }

    request.get({
      url: attachment.url,
      encoding: null
    }, got).auth('api', config.mailgun.api_key)
  }

  const attachments = (cb, results) => {
    let attachments
    try {
      attachments = JSON.parse(incoming.attachments).filter(a => Attachment.isAllowed(a.name, a.size))
    } catch (e) {
      attachments = []
    }

    async.map(attachments, attach, cb)
  }

  const message = (cb, results) => {
    const message = {
      author: results.user.id,
      message_type: 'TopLevel',
      comment: incoming['stripped-text'],
      attachments: results.attachments
    }

    Message.post(room_id, message, true, cb)
  }

  async.auto({
    user: cb => User.get(user_id, cb),
    room: cb => Room.get(room_id, cb),
    attachments: ['user', 'room', attachments],
    message: ['attachments', message]
  }, cb)
}

/**
 * Retrieves a `message` object
 * @name get
 * @function
 * @memberof Message
 * @instance
 * @public
 * @param {uuid} message_id - ID of the message being retrieved
 * @param {callback} cb - callback function
 * @returns {Message#message}
 */
Message.get = function (message_id, cb) {
  db.query(sql_get, [message_id], function (err, res) {
    if (err)
      return cb(err)

    if (res.rows.length < 1)
      return cb(null, [])

    const message = res.rows[0]
    cb(null, message)
  })
}

/**
 * Retrieves all `message` objects belonging to a `room`
 * @name retrieve
 * @function
 * @memberof Message
 * @instance
 * @public
 * @param {uuid} room_id - ID of the referenced room
 * @param {pagination} paging - pagination parameters
 * @param {callback} cb - callback function
 * @returns {Message#message[]}
 */
Message.retrieve = function (room_id, paging, cb) {
  Room.get(room_id, function (err, room) {
    if (err)
      return cb(err)

    db.query(sql_retrieve, [room_id,
                            paging.type,
                            paging.timestamp,
                            paging.limit,
                            paging.recommendation,
                            paging.reference],
             function (err, res) {
               if (err)
                 return cb(err)

               if (res.rows.length < 1)
                 return cb(null, [])

               const message_ids = res.rows.map(function (r) {
                 return r.id
               })

               async.map(message_ids, Message.get, function (err, messages) {
                 if (err)
                   return cb(err)

                 if (res.rows.length > 0)
                   messages[0].total = res.rows[0].total

                 return cb(null, messages)
               })
             })
  })
}

/**
 * Stripping the `Message` object off of it's sensitive contents for public consumption
 * @name publicize
 * @function
 * @memberof Message
 * @instance
 * @public
 * @param {Message#message} model - message model to be modified
 * @returns {Message#message} modified message object
 */
Message.publicize = function (model) {
  if (model.total) delete model.total

  return model
}

Message.associations = {
  author: {
    optional: true,
    model: 'User'
  },

  recommendation: {
    optional: true,
    model: 'Recommendation'
  },

  notification: {
    optional: true,
    model: 'Notification'
  },

  attachments: {
    collection: true,
    model: 'Attachment',
    default_value: () => []
  },

  room: {
    model: 'Room',
    enabled: false
  }
}

const sendStackedEmail = (user_id, room_id, first, last, cb) => {
  const now = (new Date()).getTime() / 1000

  if ((now - last) < (config.email.seamless_delay / 1000))
    return cb()

  const getUser = cb => {
    User.get(user_id, (err, user) => {
      if(err)
        return cb(err)

      if (!User.shouldTryEmail(user))
        return cb(Error.NotImplemented('User has emails disabled'))

      cb(null, user)
    })
  }

  const saveDelivery = (cb, results) => {
    Notification.getUnreadForRoom(user_id, room_id, (err, notifications) => {
      if (err)
        return cb(err)

      async.map(notifications, (n, cb) => {
        Notification.saveDelivery(n.id, results.user.id, results.user.email, 'email', cb)
      }, cb)
    })
  }

  const send = (cb, results) => {
    const replyTo = Crypto.encrypt(JSON.stringify({
      room_id: room_id,
      user_id: results.user.id
    })) + '@' + config.email.seamless_address

    Email.sendSane({
      from: 'Rechat <' + config.email.from + '>',
      to: [ results.user.email ],
      mailgun_options: {
        'h:Reply-To': replyTo,
        'h:In-Reply-To': '<invitation-room-' + room_id + '@rechat.com>'
      },
      html: results.html
    }, cb)
  }

  const getMessages = (cb, results) => {
    Message.retrieve(room_id, {
      type: 'Since_C',
      timestamp: (first - 1) * 1000000,
      recommendation: 'None',
      reference: 'None'
    }, (err, messages) => {
      if(err)
        return cb(err)

      const cache = {}
      async.map(messages, (m, cb) => {
        Orm.populate(m, cache, cb, ['message.room', 'message.notification', 'alert.listings'])
      }, (err, messages) => {
        if (err)
          return cb(err)

        const user_generated = messages
          .filter(m => {
            if (m.author)
              return true

            if (m.notification && !Notification.isSystemGenerated(m.notification))
              return true
          })
          .length

        if(user_generated < 1)
          return cb(Error.NotImplemented('All messages seem system-generated' + user_id))

        return cb(null, messages)
      })
    })
  }

  const getInvitation = (cb, results) => {
    let invitation_notification

    results.messages.forEach(m => {
      if (!m.notification)
        return

      if (Notification.type(m.notification) !== 'UserInvitedRoom')
        return

      if (m.notification.auxiliary_object.id !== results.user.id)
        return

      invitation_notification = m.notification
    })

    cb(null, invitation_notification)
  }

  const renderEmail = (cb, results) => {
    results.base_url = Url.create({
      brand: results.brand
    })
    Template.render(__dirname + '/../html/message/body.html', results, cb)
  }

  const report = (err) => {
    if (!err)
      return cb()

    if (err.http === 501)
      return cb()

    cb(err)
  }

  const getBrand = (cb, results) => {
    if(!results.user.brand)
      return cb()

    Brand.get(results.user.brand, (err, b) => {
      if(err)
        return cb(err)

      Orm.populate(b, {}, (err, populated) => {
        if(err)
          return cb(err)

        cb(null, populated)
      })
    }, results.user.id)
  }

  const branch = (cb, results) => {
    const notifications = results.messages.filter(m => Boolean(m.notification)).map( m => m.notification )

    const notificationBranchLink = (n, cb) => {
      const type = Notification.type(n)

      if(type !== 'UserCreatedAlert' && type !== 'UserSharedListing')
        return cb() // Only these two notifications have specific branch links for now

      let url
      const b = {}

      if(type === 'UserSharedListing') {
        url = '/dashboard/mls/' + n.object
        b.listing = n.object
        b.action = 'RedirectToListing'
      } else {
        url = '/dashboard/mls/alerts/' + n.object
        b.alert = n.object
        b.action = 'RedirectToAlert'
      }

      url = Url.create({
        uri: url,
        brand: results.user.brand
      })

      b.room = room_id
      b.sending_user = n.subject
      b.receiving_user = results.user.id
      b['$desktop_url'] = url
      b['$fallback_url'] = url

      Branch.createURL(b, cb)
    }

    const roomBranch = cb => {
      const url = Url.create({
        uri: '/branch',
        brand: results.user.brand
      })

      const b = {}
      b.room = room_id
      b.action = 'RedirectToRoom'
      b.receiving_user = results.user.id
      b.token = results.user.secondary_password
      b.email = results.user.email
      b['$desktop_url'] = url
      b['$fallback_url'] = url

      Branch.createURL(b, cb)
    }

    roomBranch((err, room_url) => {
      if(err)
        return cb(err)

      results.room_url = room_url

      async.map(notifications, notificationBranchLink, (err, urls) => {
        if(err)
          return cb(err)

        urls.forEach((u, i) => {
          notifications[i].branch_link = u ? u : room_url
        })

        cb()
      })
    })
  }

  async.auto({
    user: getUser,
    brand: ['user', getBrand],
    messages: ['user', getMessages],
    invitation: ['messages', getInvitation],
    room: cb => Room.get(room_id, cb),
    room_users: cb => Room.getUsers(room_id, cb),
    branch: ['messages', 'user', branch],
    html: ['branch', 'messages', 'brand', renderEmail],
    delivery: ['html', saveDelivery],
    send: ['html', 'room', 'delivery', 'room_users', send],
  }, report)
}

Message.sendEmailForUnread = (cb) => {
  db.query(sql_unread, [], (err, res) => {
    if (err)
      return cb(err)

    async.forEach(res.rows, (r, cb) => {
      sendStackedEmail(r.user, r.room, r.first_unread, r.last_unread, cb)
    }, cb)
  })
}

module.exports = function () {}
