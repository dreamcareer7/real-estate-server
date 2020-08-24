const EventEmitter = require('events').EventEmitter
const db = require('../../utils/db.js')


const emitter = new EventEmitter

const Notification = {
  ...require('./issue'),
  ...require('./create'),
  ...require('./constants'),
  ...require('./get'),
  ...require('./branch'),
  ...require('./send'),
  ...require('./delivery'),
  ...require('./device')
}

Notification.on = emitter.on.bind(emitter)


Notification.remove = async function(notification_id) {
  return db.query.promise('notification/delete', [notification_id])
}

module.exports = Notification
