/**
 * @namespace Reminder
 */


const Reminder = {
  ...require('./get'),
  ...require('./upsert')
}


module.exports = Reminder