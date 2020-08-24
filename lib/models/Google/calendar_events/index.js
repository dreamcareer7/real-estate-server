/**
 * @namespace GoogleCalendarEvent
 */

const GoogleCalendarEvent = {
  ...require('./get'),
  ...require('./upsert'),
  ...require('./delete')
}

module.exports = GoogleCalendarEvent