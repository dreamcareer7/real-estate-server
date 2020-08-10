/**
 * @namespace EmailThread
 */


module.exports = {
  ...require('./emitter'),
  ...require('./get'),
  ...require('./action'),
  ...require('./filter'),
}