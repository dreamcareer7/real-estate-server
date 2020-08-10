/**
 * @namespace CrmTask
 */

const emitter = require('./emitter')


module.exports = {
  ...require('./get'),
  ...require('./filter'),
  ...require('./upsert'),
  ...require('./action'),

  on: emitter.on.bind(emitter),
  once: emitter.once.bind(emitter),
}