/**
 * @namespace CrmTask
 */


module.exports = {
  ...require('./emitter'),
  ...require('./get'),
  ...require('./filter'),
  ...require('./upsert'),
  ...require('./action')
}