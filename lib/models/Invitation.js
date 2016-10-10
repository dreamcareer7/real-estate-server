/**
 * @namespace Invitations
 */

const validator = require('../utils/validator.js')
const db = require('../utils/db.js')
const config = require('../config.js')
const async = require('async')

require('../utils/require_sql.js')
require('../utils/require_asc.js')
require('../utils/require_html.js')

Invitation = {}

Orm.register('invitation', Invitation)

const schema = {
  type: 'object',
  properties: {
    invited_user: {
      type: 'string',
      uuid: true,
      required: false
    },

    inviting_user: {
      type: 'string',
      uuid: true,
      required: true
    },

    email: {
      type: 'string',
      format: 'email',
      required: false
    },

    phone_number: {
      type: 'string',
      required: false
    },

    invitee_first_name: {
      type: 'string',
      required: false
    },

    invitee_last_name: {
      type: 'string',
      required: false
    },

    room: {
      type: 'string',
      uuid: true,
      required: false
    }
  }
}

const validate = validator.bind(null, schema)

// SQL queries to work with recommendation objects
const sql_get = require('../sql/invitation/get.sql')
const sql_get_room = require('../sql/invitation/get_room.sql')
const sql_insert = require('../sql/invitation/insert.sql')

const html_body = require('../html/email.html')

const texts = {
  current_user: require('../asc/invitation/current_user.asc'),
  text_current_user_phone: require('../asc/invitation/current_user_phone.asc'),
  new_user: require('../asc/invitation/new_user.asc'),
  text_new_user_phone: require('../asc/invitation/new_user_phone.asc'),
  new_user_rechat: require('../asc/invitation/new_user_rechat.asc'),
  new_user_rechat_phone: require('../asc/invitation/new_user_rechat_phone.asc')
}

const subjects = {
  current_user: require('../asc/invitation/subject_current_user.asc'),
  new_user: require('../asc/invitation/subject_new_user.asc'),
  new_user_rechat: require('../asc/invitation/subject_new_user_rechat.asc')
}

const htmls = {
  new_user: require('../html/invitation/new_user.html'),
  new_user_rechat: require('../html/invitation/new_user_rechat.html'),
  current_user: require('../html/invitation/current_user.html')
}

Invitation.get = function (id, cb) {
  db.query(sql_get, [id], function (err, res_base) {
    if (err) {
      return cb(err)
    }

    if (res_base.rows.length < 1)
      return cb(Error.ResourceNotFound('Invitation not found'))

    const invitation = res_base.rows[0]
    cb(null, invitation)
  })
}

Invitation.create = function (invitation, cb) {
  async.auto({
    validate: cb => {
      return validate(invitation, cb)
    },
    resolve: [
      'validate',
      cb => {
        return Contact.resolve(invitation.email, invitation.phone_number, cb)
      }
    ],
    agent: [
      'validate',
      cb => {
        if (!invitation.email)
          return cb()

        return Agent.matchByEmail(invitation.email, cb)
      }
    ],
    inviting_user: [
      'validate',
      cb => {
        return User.get(invitation.inviting_user, cb)
      }
    ],
    invited_user: [
      'validate',
      cb => {
        if (!invitation.invited_user)
          return cb()

        return User.get(invitation.invited_user, cb)
      }
    ],
    room: [
      'validate',
      cb => {
        if (!invitation.room)
          return cb()

        return Room.get(invitation.room, cb)
      }
    ],
    user: [
      'resolve',
      (cb, results) => {
        if (results.resolve)
          return User.get(results.resolve, cb)

        return cb()
      }
    ],
    email_shadow: [
      'user',
      (cb, results) => {
        if (!invitation.email)
          return cb()

        if (results.user)
          return cb()

        User.getOrCreateByEmail(invitation.email, (err, user) => {
          if (err)
            return cb(err)

          results.user = user
          return cb(null, user)
        })
      }
    ],
    phone_shadow: [
      'user',
      'email_shadow',
      (cb, results) => {
        if(!invitation.phone_number)
          return cb()

        if(results.user)
          return cb()

        User.getOrCreateByPhoneNumber(invitation.phone_number, (err, user) => {
          if(err)
            return cb(err)

          results.user = user
          return cb(null, user)
        })
      }
    ],
    type: [
      'user',
      'phone_shadow',
      'email_shadow',
      (cb, results) => {
        if (results.user && !results.user.is_shadow) {
          if (invitation.room)
            return cb(null, 'current_user')
          else
            return cb(null, 'current_user_rechat')
        } else {
          if (invitation.room)
            return cb(null, 'new_user')
          else
            return cb(null, 'new_user_rechat')
        }
      }
    ],
    branch: [
      'room',
      'user',
      'email_shadow',
      'phone_shadow',
      'agent',
      (cb, results) => {
        const data = {}

        if (invitation.inviting_user)
          data.inviting_user = invitation.inviting_user

        if (invitation.room)
          data.room = invitation.room

        const s = results.user || results.email_shadow || results.phone_shadow

        if(s) {
          data.receiving_user = s.id
          data.token = s.secondary_password
        }

        if (invitation.phone_number)
          data.phone_number = invitation.phone_number

        if (invitation.email)
          data.email = invitation.email

        if (results.agent)
          data.agent = results.agent

        const token_plain = JSON.stringify(data)
        const token = Crypto.encrypt(token_plain)

        data.action = 'Invitation'

        const url = Url.create({
          uri: '/signup',
          query: {
            token: token
          }
        })

        data['$desktop_url'] = url
        data['$fallback_url'] = url

        Branch.createURL(data, cb)
      }
    ],
    record_invitation: [
      'branch',
      (cb, results) => {
        db.query(sql_insert, [
          invitation.inviting_user,
          invitation.invited_user,
          invitation.email,
          invitation.phone_number,
          invitation.invitee_first_name,
          invitation.invitee_last_name,
          results.branch,
          invitation.room
        ], function (err, res) {
          if (err)
            return cb(err)

          return cb(null, res.rows[0].id)
        })
      }
    ],
    add_user_to_room: [
      'type',
      'room',
      'user',
      'email_shadow',
      'phone_shadow',
      (cb, results) => {
        if (!results.room)
          return cb()

        if (!results.user)
          return cb()

        Room.isMember(results.user.id, results.room.id, (err, member) => {
          if (member)
            return cb()

          return Room.addUser(results.user.id, results.room.id, false, cb)
        })
      }
    ],
    send_notification: [
      'add_user_to_room',
      'user',
      'room',
      'email_shadow',
      'phone_shadow',
      'inviting_user',
      'record_invitation',
      (cb, results) => {
        if (results.room) {
          const notification = {}

          const name = (results.user) ? results.user.first_name :
                ((invitation.invitee_first_name) ? invitation.invitee_first_name :
                 ((invitation.email) ? invitation.email : invitation.phone_number))

          notification.message = '@' + results.inviting_user.first_name + ' invited ' +
            name + ' to join #' + results.room.proposed_title
          notification.action = 'Invited'
          notification.subject = invitation.inviting_user
          notification.subject_class = 'User'
          notification.object = invitation.room
          notification.object_class = 'Room'
          if (results.user) {
            notification.auxiliary_object = results.user.id
            notification.auxiliary_object_class = 'User'
          }
          notification.auxiliary_subject_class = 'Invitation'
          notification.auxiliary_subject = results.record_invitation

          notification.room = invitation.room

          return Notification.issueForRoomExcept(notification, invitation.inviting_user, cb)
        } else {
          return cb()
        }
      }
    ],
    invitation: [
      'record_invitation',
      (cb, results) => {
        return Invitation.get(results.record_invitation, cb)
      }
    ],
    send_email: [
      'invitation',
      'inviting_user',
      'user',
      'email_shadow',
      'phone_shadow',
      'room',
      'type',
      'branch',
      (cb, results) => {
        if (!results.type || results.type == 'current_user_rechat' || !invitation.email)
          return cb()

        if (invitation.suppress_email)
          return cb()

        return Email.send({
          from: config.email.from,
          to: [ invitation.email ],
          source: config.email.source,
          html_body: html_body,
          mailgun_options: {
            'h:Message-ID': results.room ?
              '<invitation-room-' + results.room.id + '@rechat.com>'
              : '<invitation-room-' + results.invitation + '@rechat.com>'
          },
          message: {
            body: {
              html: {
                data: htmls[results.type]
              },
              text: {
                data: texts[results.type]
              }
            },
            subject: {
              data: subjects[results.type]
            }
          },
          template_params: {
            first_name: results.inviting_user.first_name,
            last_name: results.inviting_user.last_name,
            invitee_email: invitation.email,
            invitee_first_name: (results.user) ? results.user.first_name :
              ((invitation.invitee_first_name) ? invitation.invitee_first_name : null),
            invitee_last_name: (results.user) ? results.user.last_name :
              ((invitation.invitee_last_name) ? invitation.invitee_last_name : null),
            branch_url: results.branch,
            room_title: results.room.proposed_title,
            base_url: Url.create({}),
            _title: 'Invitation'
          }
        }, cb)
      }
    ],
    send_sms: [
      'invitation',
      'inviting_user',
      'user',
      'email_shadow',
      'phone_shadow',
      'room',
      'type',
      'branch',
      (cb, results) => {
        if (!invitation.phone_number)
          return cb()

        if (invitation.suppress_sms)
          return cb()

        return SMS.send({
          from: config.twilio.from,
          to: invitation.phone_number,
          body: texts[results.type + '_phone'],
          template_params: {
            first_name: results.inviting_user.first_name,
            last_name: results.inviting_user.last_name,
            invitee_email: invitation.email,
            invitee_first_name: (results.user) ? results.user.first_name :
              ((invitation.invitee_first_name) ? invitation.invitee_first_name : null),
            invitee_last_name: (results.user) ? results.user.last_name :
              ((invitation.invitee_last_name) ? invitation.invitee_last_name : null),
            room_title: results.room.proposed_title,
            base_url: Url.create({}),
            branch_url: results.branch
          }
        }, cb)
      }
    ]
  }, (err, results) => {
    if (err)
      return cb(err)

    return cb(null, results.invitation)
  })
}

Invitation.getForRoom = function (room_id, cb) {
  Room.get(room_id, function (err, room) {
    if (err)
      return cb(err)

    db.query(sql_get_room, [room_id], function (err, res) {
      if (err)
        return cb(err)

      if (res.rows.length < 1)
        return cb(null, [])

      const ids = res.rows.map(r => r.id)
      cb(null, ids)
    })
  })
}

Invitation.invitePhoneNumbersToNewRoom = function (user_id, phones, cb) {
  async.map(phones, (r, cb) => {
    Invitation.invitePhoneNumberToNewRoom(user_id, r, undefined, (err, invitation) => {
      if (err)
        return cb(err)

      return cb(null, invitation.room)
    })
  }, cb)
}

Invitation.invitePhoneNumberToNewRoom = function (user_id, phone, room_title, cb) {
  const clone = {
    client_type: 'Unknown',
    room_type: 'Group',
    owner: user_id,
    title: room_title || 'Welcome to Rechat'
  }

  Room.create(clone, (err, room) => {
    if (err)
      return cb(err)

    const invitation = {
      inviting_user: user_id,
      phone_number: phone,
      room: room.id,
      suppress_email: true,
      suppress_sms: true
    }

    Invitation.create(invitation, (err, invitation) => {
      if (err)
        return cb(err)

      return cb(null, invitation)
    })
  })
}

Invitation.publicize = function (model) {
  if (model.url) delete model.url

  return model
}

Invitation.associations = {
  invited_user: {
    optional: true,
    model: 'User'
  },

  inviting_user: {
    optional: true,
    model: 'User'
  }
}

module.exports = function () {

}
