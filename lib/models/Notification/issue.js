const async = require('async')
const _u = require('underscore')

const Context = require('../Context')
const { create } = require('./create')

const override = (notification, overrides, entity) => {
  if (overrides.subject)
    notification.subject = entity

  if (overrides.object)
    notification.object = entity

  return notification
}

const issueForRoom = (notification, cb) => {
  Context.log('Notification::issueForRoom', JSON.stringify(notification))
  create(notification, cb)
}

const issueForRoomExcept = (notification, exceptions, cb) => {
  Context.log('Notification::issueForRoomExcept', JSON.stringify(notification), 'Except:', exceptions)
  notification.exclude = exceptions
  create(notification, cb)
}

const issueForUser = (notification, user_id, cb) => {
  Context.log('Notification::issueForUser', JSON.stringify(notification), 'Specific:', user_id)
  notification.specific = user_id
  create(notification, cb)
}

const issueForUsers = (notification, users, overrides, cb) => {
  Context.log('Notification::issueForUsers', JSON.stringify(notification), 'For users:', users)
  async.map(users, (r, cb) => {
    let n = _u.clone(notification)
    n.specific = r
    n = override(n, overrides, r)

    create(n, cb)
  }, cb)
}

const issueForUsersExcept = (notification, users, user_id, overrides, cb) => {
  Context.log('Notification::issueForUsersExcept', JSON.stringify(notification), 'For users:', users)
  async.map(users, (r, cb) => {
    if (r === user_id)
      return cb()

    let n = _u.clone(notification)
    n.specific = r
    n = override(n, overrides, r)

    return create(n, cb)
  }, cb)
}

module.exports = {
  issueForRoom,
  issueForRoomExcept,
  issueForUser,
  issueForUsers,
  issueForUsersExcept
}
