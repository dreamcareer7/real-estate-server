/**
 * @namespace GoogleMessage
 */

const { EventEmitter } = require('events')
const emitter = new EventEmitter()

const GoogleMessage = {
  on: emitter.on.bind(emitter),
  once: emitter.once.bind(emitter),

  ...require('./create'),
  ...require('./get'),
  ...require('./update'),
  ...require('./filter'),
  ...require('./campaign'),
  ...require('./delete'),
  ...require('./email'),
  ...require('./batch'),
  ...require('./remote'),
  ...require('./watch')
}

module.exports = GoogleMessage