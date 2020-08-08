const { EventEmitter } = require('events')

const emitter = new EventEmitter()

module.exports = {
  on: emitter.on.bind(emitter),
  once: emitter.once.bind(emitter),
  emit: emitter.emit.bind(emitter),
}
