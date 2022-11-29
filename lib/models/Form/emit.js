const { EventEmitter } = require('events')
const emitter = new EventEmitter()

const on = emitter.on.bind(emitter)
const once = emitter.once.bind(emitter)
const emit = emitter.emit.bind(emitter)

module.exports = { on, once, emit }
