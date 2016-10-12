const async = require('async')
const _u = require('underscore')

function getNotification (req, res) {
  const notification_id = req.params.id

  Notification.get(notification_id, function (err, notification) {
    if (err)
      return res.error(err)

    return res.model(notification)
  })
}

function getNotifications (req, res) {
  const user_id = req.user.id
  const paging = {}
  req.pagination(paging)

  Notification.getForUser(user_id, paging, (err, notifications) => {
    if (err)
      return res.error(err)

    return res.collection(notifications)
  })
}

function ackNotification (req, res) {
  const user_id = req.user.id
  const notification_id = req.params.id

  Notification.ack(user_id, notification_id, err => {
    if (err)
      return res.error(err)

    res.status(204)
    return res.end()
  })
}

function ackNotificationBulk (req, res) {
  const user_id = req.user.id
  const notification_ids = req.query.ids || []

  async.map(notification_ids, (r, cb) => {
    Notification.ack(user_id, r, cb)
  }, function (err) {
    if (err)
      return res.error(err)

    res.status(204)
    return res.end()
  })
}

function ackMessage (req, res) {
  if (!req.query.message)
    return res.error(Error.Validation('Supply a message ID'))

  const user_id = req.user.id
  const message_id = req.query.message

  Notification.ackMessage(user_id, message_id, function (err, notification) {
    if (err)
      return res.error(err)

    res.status(200)
    return res.model(notification)
  })
}

function registerForPush (req, res) {
  const user_id = req.user.id
  const token = req.body.device_token
  const device = req.body.device_id

  Notification.registerForPush(user_id, device, token, function (err, user) {
    if (err)
      return res.error(err)

    return res.model(user)
  })
}

function unregisterForPush (req, res) {
  const user_id = req.user.id
  const token = req.params.token

  Notification.unregisterForPush(user_id, token, function (err, user) {
    if (err)
      return res.error(err)

    return res.model(user)
  })
}

function patchNotificationSettings (req, res) {
  const user_id = req.user.id
  const room_id = req.params.id
  const enable = req.body.notification

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

function getNotificationsCount (req, res) {
  const user_id = req.user.id

  Notification.summary(user_id, (err, summary) => {
    if (err)
      return res.error(err)

    return res.json({
      code: 'OK',
      data: summary
    })
  })
}

function ackRoom (req, res) {
  const user_id = req.user.id
  const room_id = req.params.id

  if ((req.query.subjects || req.query.actions || req.query.objects) &&
     !(req.query.subjects && req.query.actions && req.query.subjects)) {
    return res.error(Error.Validation('You must either supply all of the following or none: subject, action and object'))
  }
  else if (req.query.subjects && req.query.actions && req.query.subjects) {
    const type = {
      subjects: req.query.subjects || [],
      actions: req.query.actions || [],
      objects: req.query.objects || []
    }

    Notification.ackType(user_id, room_id, type, err => {
      if (err)
        return res.error(err)

      res.status(204)
      return res.end()
    })
  } else {
    Notification.ackRoom(user_id, room_id, err => {
      if (err)
        return res.error(err)

      res.status(204)
      return res.end()
    })
  }
}

function ackAlert (req, res) {
  const user_id = req.user.id
  const alert_id = req.params.id

  Notification.ackAlert(user_id, alert_id, err => {
    if (err)
      return res.error(err)

    res.status(204)
    return res.end()
  })
}

function ackTasks (req, res) {
  const user_id = req.user.id

  Notification.ackTasks(user_id, err => {
    if (err)
      return res.error(err)

    res.status(204)
    return res.end()
  })
}

function ackTask (req, res) {
  const user_id = req.user.id
  const task_id = req.params.id

  Notification.ackTask(task_id, user_id, err => {
    if (err)
      return res.error(err)

    res.status(204)
    return res.end()
  })
}

function ackTransactions (req, res) {
  const user_id = req.user.id

  Notification.ackTransactions(user_id, err => {
    if (err)
      return res.error(err)

    res.status(204)
    return res.end()
  })
}

function ackTransaction (req, res) {
  const user_id = req.user.id
  const transaction_id = req.params.id

  Notification.ackTransaction(transaction_id, user_id, err => {
    if (err)
      return res.error(err)

    res.status(204)
    return res.end()
  })
}

function ackContacts (req, res) {
  const user_id = req.user.id

  Notification.ackContacts(user_id, err => {
    if (err)
      return res.error(err)

    res.status(204)
    return res.end()
  })
}

function ackContact (req, res) {
  const user_id = req.user.id
  const contact_id = req.params.id

  Notification.ackContact(contact_id, user_id, err => {
    if (err)
      return res.error(err)

    res.status(204)
    return res.end()
  })
}

const config = require('../config.js')

function create (req, res) {
  if (config.webapp.hostname === 'rechat.com') //For god's sake WTF is this.
    return res.error(Error.MethodNotAllowed())

  const notification = req.body

  Notification.create(notification, (err, n) => {
    if (err) {
      console.log(err)
      return res.error(err)
    }

    res.model(n)
  })
}

function form (req, res) {
  Template.render(__dirname + '/../html/notification/create.html', {
    objects: Notification.object_enum,
    actions: Notification.action_enum
  }, (err, html) => {
    if (err)
      return res.error(err)

    res.end(html)
  })
}

const router = function (app) {
  const b = app.auth.bearer

  app.delete('/tasks/notifications', b(ackTasks))
  app.delete('/transactions/notifications', b(ackTransactions))
  app.delete('/contacts/notifications', b(ackContacts))
  app.delete('/transactions/:id/notifications', b(ackTransaction))
  app.delete('/tasks/:id/notifications', b(ackTask))
  app.delete('/alerts/:id/notifications', b(ackAlert))
  app.delete('/contacts/:id/notifications', b(ackContact))
  app.get('/notifications/summary', b(getNotificationsCount))
  app.post('/notifications/tokens', b(registerForPush))
  app.get('/notifications', b(getNotifications))
  app.delete('/notifications', b(ackMessage))
  app.delete('/notifications', b(ackNotificationBulk))
  app.delete('/notifications/tokens/:token', b(unregisterForPush))
  app.delete('/rooms/:id/notifications', b(ackRoom))
  app.patch('/rooms/:id/notifications', b(patchNotificationSettings))
  app.get('/notifications/:id', b(getNotification))
  app.delete('/notifications/:id', b(ackNotification))

  app.get('/notification/create', form)
  app.post('/notifications', create)
}

module.exports = router
