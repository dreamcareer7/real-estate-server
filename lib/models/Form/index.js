/**
 * @namespace Form
 */


const { EventEmitter } = require('events')
const emitter = new EventEmitter()

if (process.env.NODE_ENV === 'tests') {
  require('./mock.js')
}


const Form = {
  on: emitter.on.bind(emitter),
  once: emitter.once.bind(emitter),
  emit: emitter.emit.bind(emitter),

  ...require('./get'),
  ...require('./upsert')
}


module.exports = Form
