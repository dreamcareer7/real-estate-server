/**
 * @namespace GoogleCalendar
 */

const GoogleCalendar = {
  ...require('./get'),
  ...require('./upsert')
}

module.exports = GoogleCalendar