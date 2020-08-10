/**
 * @namespace Flow
 */

const emitter = require('./emitter')


module.exports = {
  emit: emitter.emit.bind(emitter),

  ...require('./get'),
  ...require('./upsert'),
  ...require('./filter'),
}