/**
 * @namespace Message
 */

const db = require('../utils/db.js')
const validator = require('../utils/validator.js')
const async = require('async')
const EventEmitter = require('events').EventEmitter
const config = require('../config.js')
const Mime = require('mime')

Message = new EventEmitter()

Orm.register('message', 'Message')

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
 * @property {string=} image_thumbnail_url - URL of the thumbnail image attached to this message if any
 * @property {uuid=} notification - ID of the notification object linked with this message
 */

const schema = {
  type: 'object',
  properties: {
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

      User.getAll(message.mentions, cb)
    },
    listing: [
      'recommendation',
      (cb, results) => {
        if (!message.recommendation)
          return cb()

        return Listing.get(results.recommendation.listing, cb)
      }
    ],
    is_member: [
      'room',
      'author',
      (cb, results) => {
        if (message.author && !Room.belongs(results.room.users, message.author))
          return cb(Error.Forbidden(`User ${message.author} is not a member of this room`))

        return cb()
      }
    ],
    post: [
      'is_member',
      'validate',
      'mentions',
      'check_recommendation',
      cb => {
        db.query('message/post', [
          room_id,
          message.comment,
          message.image_url,
          message.document_url,
          message.video_url,
          message.recommendation,
          message.reference,
          message.author,
          message.notification,
          message.mentions
        ], (err, res) => {
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
          AttachedFile.get(r, err => {
            if (err)
              return cb(err)

            return AttachedFile.link(r, {
              role: 'Message',
              id: results.post
            }, cb)
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

        if (message.comment) {
          aux = ' ' + message.comment
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
        notification.extra_subject_class = sub_aux ? sub_aux : null
        notification.room = room_id

        return Notification.issueForRoomExcept(notification, user.id, cb)
      }
    ],
    activity: [
      'recommendation',
      'post',
      (cb, results) => {
        if(!results.recommendation || !message.author)
          return cb()

        const activity = {
          action: 'UserCommentedRoom',
          object: results.post,
          object_class: 'message'
        }

        Activity.add(message.author, 'User', activity, cb)
      }
    ]
  }, (err, results) => {
    if (err)
      return cb(err)

    return cb(null, results.message)
  })
}

Message.postSeamlessEmail = function (incoming, cb) {
  if (incoming.domain !== config.mailgun.domain)
    return cb(Error.Forbidden('Domain is invalid'))

  const e = () => {
    return Error.NotAcceptable('Cannot determine the sender or receiver of this message')
  }

  let attached_files
  try {
    attached_files = JSON.parse(incoming.attachments).filter(a => AttachedFile.isAllowed(a.name, a.size))
  } catch (e) {
    attached_files = []
  }

  if (!incoming['stripped-text'] && attached_files.length < 1)
    return cb(Error.NotAcceptable('Nothing to post'))

  const to = incoming.recipient.match('(.*)@')
  if (!to || !to[1])
    return cb(e())

  let room_id, user_id, decrypted, user

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
    AttachedFile.saveFromUrl({
      url: {
        url: attachment.url,
        auth: {
          user: 'api',
          pass: config.mailgun.api_key
        }
      },
      filename: attachment.name,
      relations: [{
        role: 'Room',
        id: room_id
      }],
      path: room_id,
      user
    }, cb)
  }

  const attachments = (cb, results) => {
    user = results.user
    async.map(attached_files, attach, cb)
  }

  const message = (cb, results) => {
    const message = {
      author: results.user.id,
      comment: incoming['stripped-text'],
      attachments: results.attachments.map(a => a.id)
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

Message.postSeamlessSMS = function(incoming, cb) {
  const e = () => {
    return Error.NotAcceptable('Cannot determine the sender or receiver of this message')
  }

  const media_count = incoming.NumMedia

  if (!incoming.Body && (!media_count || media_count < 1))
    return cb(Error.NotAcceptable('Nothing to post'))

  const from = incoming.From
  const to = incoming.To

  if (!from)
    return cb(e())

  if (!to)
    return cb(e())

  let user, room_id

  const attach = (attachment, cb) => {
    AttachedFile.saveFromUrl({
      url: attachment.url,
      filename: attachment.name,
      relations: [{
        role: 'Room',
        id: room_id
      }],
      path: room_id,
      user
    }, cb)
  }

  const attachments = (cb, results) => {
    const files = []
    user = results.user
    room_id = results.room

    for(let i = 0; i < media_count; i++) {
      const id = incoming.SmsSid + '-' + i
      const mime = incoming['MediaContentType' + i]
      const ext = Mime.extension(mime)

      const file = {
        name: i + '.' + ext,
        'content-type': mime,
        url: incoming['MediaUrl' + i],
        id
      }

      files.push(file)
    }

    async.map(files, attach, cb)
  }

  const message = (cb, results) => {
    const message = {
      author: results.user.id,
      comment: incoming.Body,
      attachments: results.attachments.map(a => a.id)
    }

    Message.post(results.room, message, true, cb)
  }

  async.auto({
    attachments: ['user', 'room', attachments],
    message: ['attachments', 'user', 'room', message],
    user: cb => {
      User.getByPhoneNumber(from, cb)
    },
    room: [
      'user',
      (cb, results) => {
        if (!results.user)
          return cb(e())

        Room.resolveRoomForSeamless(results.user.id, to, cb)
      }
    ],
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
  Message.getAll([message_id], (err, messages) => {
    if(err)
      return cb(err)

    if (messages.length < 1)
      return cb(Error.ResourceNotFound(`Message ${message_id} not found`))

    const message = messages[0]

    return cb(null, message)
  })
}

Message.getAll = function(message_ids, cb) {
  db.query('message/get', [message_ids], (err, res) => {
    if (err)
      return cb(err)

    const messages = res.rows

    return cb(null, messages)
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

    db.query('message/retrieve', [
      room_id,
      paging.type,
      paging.timestamp,
      paging.limit,
      paging.recommendation,
      paging.reference
    ], (err, res) => {
      if (err)
        return cb(err)

      if (res.rows.length < 1)
        return cb(null, [])

      const message_ids = res.rows.map(function (r) {
        return r.id
      })

      Message.getAll(message_ids, (err, messages) => {
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
    model: 'AttachedFile',
    default_value: () => []
  }
}

const sendStackedEmail = (user_id, room_id, first, last, cb) => {
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

    const mailgun_options = {
      'h:Reply-To': replyTo
    }

    const invitation_email_id = '<invitation-room-' + room_id + '@rechat.com>'
    let subject

    // This is the first email that includes invitation.
    // Its going to have an ID so later we can reference its ID for threading
    if (results.invitation) {
      mailgun_options['h:Message-ID'] = invitation_email_id
      subject = results.invitation.subjects[0].display_name + '\'s invitation'
    } else {

    // This is not the first email. So its going to be threaded under the first email which has been sent previously.
      mailgun_options['h:In-Reply-To'] = invitation_email_id
      subject = 'New message on ' + results.room.proposed_title
    }

    Email.sendSane({
      from: 'Rechat <' + config.email.from + '>',
      to: [ results.user.email ],
      subject,
      mailgun_options,
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

      Orm.populate({
        models: messages,
        associations: ['message.room', 'message.notification', 'alert.listings']
      }).nodeify((err, messages) => {
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
    results.base_url = Url.web({
      brand: results.brand
    })
    Template.render(__dirname + '/../html/message/body.html', results, cb)
  }

  const report = (err, results) => {
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

      Orm.populate({
        models: [b]
      }).nodeify((err, populated) => {
        if(err)
          return cb(err)

        cb(null, populated[0])
      })
    }, results.user.id)
  }

  const getBrandUser = (cb, results) => {
    if (!results.brand || !results.brand.users)
      return cb()

    const brand_user_ids = results.brand.users.map(u => u.id)
    const invitation = results.invitation

    if (invitation) {
      // There's an invitation. Let's see if the person who invited us should be promoted.
      if (brand_user_ids.indexOf(invitation.subjects[0].id) > -1)
        return cb(null, invitation.subjects[0])
    }

    const messages = results.messages
    const found = !messages.every(m => {
      if (!m.author)
        return true

      if (brand_user_ids.indexOf(m.author.id) > -1) {
        cb(null, m.author)
        return false // Stops the loop.
      }

      return true
    })

    // No brand user found.
    if (!found)
      return cb()
  }

  const branch = (cb, results) => {
    const notifications = results.messages.filter(m => Boolean(m.notification)).map( m => m.notification )

    const getBranch = cb => Room.getBranchLink({
      user_id: results.user.id,
      room_id: results.room.id
    }, cb)

    const getBranchNoFallback = cb => Room.getBranchLink({
      user_id: results.user.id,
      room_id: results.room.id,
      fallabck: false
    }, cb)

    const getNotificationBranches = (cb, nresults) => {
      async.map(notifications, (r, cb) => {
        Notification.getBranchLink(r, results.user, room_id, cb)
      }, (err, urls) => {
        if(err)
          return cb(err)

        urls.forEach((u, i) => {
          notifications[i].branch_link = u ? u : nresults.room_branch
        })

        return cb()
      })
    }

    async.auto({
      room_branch: getBranch,
      room_branch_no_fallback: getBranchNoFallback,
      notifications: ['room_branch', getNotificationBranches]
    }, (err, branches) => {
      if (err)
        return cb(err)

      results.room_url = branches.room_branch
      results.room_url_no_fallback = branches.room_branch_no_fallback
      cb()
    })
  }

  const getUsers = (cb, results) => {
    User.getAll(results.room.users, cb)
  }

  async.auto({
    user: getUser,
    messages: ['user', getMessages],
    invitation: ['messages', getInvitation],
    brand: ['user', 'messages', 'invitation', getBrand],
    brand_user: ['messages', 'invitation', 'brand', getBrandUser],
    room: cb => Room.get(room_id, cb),
    room_users: ['room', getUsers],
    branch: ['messages', 'user', branch],
    html: ['branch', 'messages', 'brand', 'brand_user', renderEmail],
    delivery: ['html', saveDelivery],
    send: ['html', 'room', 'delivery', 'room_users', send],
  }, report)
}

Message.sendEmailForUnread = (cb) => {
  db.query('message/unread', [
    config.email.seamless_delay,
    config.email.seamless_timeout,
  ], (err, res) => {
    if (err)
      return cb(err)

    async.forEach(res.rows, (r, cb) => {
      sendStackedEmail(r.user, r.room, r.first_unread, r.last_unread, cb)
    }, cb)
  })
}

module.exports = function () {}
