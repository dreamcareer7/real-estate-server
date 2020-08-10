/**
 * @namespace CrmTask
 */

const CrmTaskEventEmitter = require('./emitter')
const emitter = new CrmTaskEventEmitter()


module.exports = {
  ...require('./get'),
  ...require('./filter'),
  ...require('./upsert'),
  ...require('./action'),

  on: emitter.on.bind(emitter),
  once: emitter.once.bind(emitter),
}