/**
 * @namespace GoogleCalendar
 */

const GoogleCalendar = {
  ...require('./get'),
  ...require('./upsert'),
  ...require('./delete')
}

module.exports = GoogleCalendar