const Context = require('../Context')
const async = require('async')
const _u = require('underscore')
const Job = require('../Job')

const override = (notification, overrides, entity) => {
  if (overrides.subject)
    notification.subject = entity

  if (overrides.object)
    notification.object = entity

  return notification
}

const issueForRoom = (notification, cb) => {
  Context.log('Notification::issueForRoom', JSON.stringify(notification))
  return schedule(notification, cb)
}

const issueForRoomExcept = (notification, exceptions, cb) => {
  Context.log('Notification::issueForRoomExcept', JSON.stringify(notification), 'Except:', exceptions)
  notification.exclude = exceptions
  return schedule(notification, cb)
}

const issueForUser = (notification, user_id, cb) => {
  Context.log('Notification::issueForUser', JSON.stringify(notification), 'Specific:', user_id)
  notification.specific = user_id
  return schedule(notification, cb)
}

const issueForUsers = (notification, users, overrides, cb) => {
  Context.log('Notification::issueForUsers', JSON.stringify(notification), 'For users:', users)
  async.map(users, (r, cb) => {
    let n = _u.clone(notification)
    n.specific = r
    n = override(n, overrides, r)

    return schedule(n, cb)
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

    return schedule(n, cb)
  }, cb)
}

const queueSchedule = (notification, cb) => {
  if (!notification.delay)
    notification.delay = 0

  const job = Job.queue.create('create_notification', {
    notification: notification
  })
    .removeOnComplete(true)
    .delay(notification.delay)
    .attempts(1)
    .backoff({type: 'exponential'})

  Context.get('jobs').push(job)
  return cb(null, {})
}

const memorySchedule = function (notification, cb) {
  /*
   * This is the function we use to schedule notification in a test environment.
   * Instead of queueing a Notification.create, it'll queue it using in memory timeout
   * So we wouldnt need a worker for tests.
   *
   * Please note that we don't want to always require create.js from here.
   * Only in tests.
   */
  const { create } = require('./create')

  if (!notification.delay)
    notification.delay = 0

  setTimeout(function () {
    create(notification, cb)
  }, notification.delay)
}

const isTest = process.env.NODE_ENV === 'tests'
const schedule = isTest ? memorySchedule : queueSchedule

module.exports = {
  issueForRoom,
  issueForRoomExcept,
  issueForUser,
  issueForUsers,
  issueForUsersExcept
}
