const _u = require('underscore')
const expect = require('../utils/validator.js').expect

function getNotification (req, res) {
  const notification_id = req.params.id

  expect(notification_id).to.be.uuid

  Notification.get(notification_id, (err, notification) => {
    if (err)
      return res.error(err)

    return res.model(notification)
  })
}

function getNotifications (req, res) {
  const user_id = req.user.id
  const paging = {}
  req.pagination(paging)

  // FIXME: temprary fix until we have paging on web
  if(!paging.limit)
    paging.limit = 20

  Notification.getForUser(user_id, paging, (err, notifications) => {
    if (err)
      return res.error(err)

    return res.collection(notifications)
  })
}

function patchSeen (req, res) {
  const user_id = req.user.id
  const notification_id = req.params.id

  expect(notification_id).to.be.uuid
  expect(user_id).to.be.uuid

  Notification.patchSeen(user_id, notification_id, err => {
    if (err)
      return res.error(err)

    res.status(204)
    return res.end()
  })
}

function registerForPush (req, res) {
  const user_id = req.user.id
  const channel = req.body.channel

  expect(user_id).to.be.uuid
  expect(channel).to.be.a('string')

  Notification.registerForPush(user_id, channel, (err, user) => {
    if (err)
      return res.error(err)

    return res.model(user)
  })
}

function unregisterForPush (req, res) {
  const user_id = req.user.id
  const channel = req.params.channel

  Notification.unregisterForPush(user_id, channel, (err, user) => {
    if (err)
      return res.error(err)

    return res.model(user)
  })
}

function patchNotificationSettings (req, res) {
  const user_id = req.user.id
  const room_id = req.params.id
  const enable = req.body.notification

  expect(room_id).to.be.uuid

  if (!_u.isBoolean(enable))
    return res.error(Error.Validation('notification property must be a boolean value'))

  User.get(user_id, function (err, user) {
    if (err)
      return res.error(err)

    Room.get(room_id, function (err, room) {
      if (err)
        return res.error(err)

      Room.setPushSettings(user_id, room_id, enable, function (err, ok) {
        if (err)
          return res.error(err)

        Room.get(room_id, function (err, room) {
          if (err)
            return res.error(err)

          return res.model(room)
        })
      })
    })
  })
}

function ackRoom (req, res) {
  const user_id = req.user.id
  const room_id = req.params.id

  expect(room_id).to.be.uuid
  expect(user_id).to.be.uuid

  Notification.ackRoom(user_id, room_id, err => {
    if (err)
      return res.error(err)

    res.status(204)
    return res.end()
  })
}

function ackPersonal (req, res) {
  const user_id = req.user.id

  expect(user_id).to.be.uuid

  Notification.ackPersonal(user_id, err => {
    if (err)
      return res.error(err)

    res.status(204)
    return res.end()
  })
}

const router = function (app) {
  const b = app.auth.bearer

  app.post('/notifications/tokens', b(registerForPush))
  app.delete('/notifications/tokens/:token', b(unregisterForPush))
  app.patch('/rooms/:id/notifications', b(patchNotificationSettings))
  app.get('/notifications/:id', b(getNotification))
  app.patch('/notifications/:id/seen', b(patchSeen))

  app.delete('/rooms/:id/notifications', b(ackRoom))
  app.delete('/notifications', b(ackPersonal))
  app.get('/notifications', b(getNotifications))
}

module.exports = router
