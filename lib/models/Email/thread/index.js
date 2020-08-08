/**
 * @namespace EmailThread
 */

const emitter = require('./emitter')


module.exports = {
  ...emitter,

  ...require('./get'),
  ...require('./action'),
  ...require('./filter'),
}