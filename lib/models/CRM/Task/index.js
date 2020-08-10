/**
 * @namespace CrmTask
 */


module.exports = {
  ...require('./get'),
  ...require('./filter'),
  ...require('./upsert'),
  ...require('./action')
}