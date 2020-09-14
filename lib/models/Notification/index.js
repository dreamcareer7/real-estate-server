const EventEmitter = require('events').EventEmitter

const emitter = new EventEmitter

const Notification = {
  ...require('./issue'),
  ...require('./create'),
  ...require('./constants'),
  ...require('./get'),
  ...require('./branch'),
  ...require('./send'),
  ...require('./delivery'),
  ...require('./device'),
  ...require('./remove'),
}

Notification.on = emitter.on.bind(emitter)


module.exports = Notification
