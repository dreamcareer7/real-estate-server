/**
 * @namespace EmailThread
 */

const emitter = require('./emitter')


module.exports = {
  on: emitter.on.bind(emitter),

  ...require('./get'),
  ...require('./action'),
  ...require('./filter'),
}