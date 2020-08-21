/**
 * @namespace Message
 */

const EventEmitter = require('events').EventEmitter

const emitter = new EventEmitter()

const Message = {
  ...require('./get'),
  ...require('./post'),
  ...require('./email')
}

Message.on = emitter.on.bind(emitter)

module.exports = Message
