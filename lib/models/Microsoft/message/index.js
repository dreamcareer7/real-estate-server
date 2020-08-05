/**
 * @namespace MicrosoftMessage
 */

const { EventEmitter } = require('events')
const emitter = new EventEmitter()

const MicrosoftMessage = {
  on: emitter.on.bind(emitter),
  once: emitter.once.bind(emitter),

  ...require('./create'),
  ...require('./get'),
  ...require('./update'),
  ...require('./filter'),
  ...require('./delete'),
  ...require('./email'),
  ...require('./batch'),
  ...require('./remote')
}

module.exports = MicrosoftMessage