/**
 * @namespace GoogleCalendarEvent
 */

const GoogleCalendarEvent = {
  ...require('./get'),
  ...require('./upsert')
}

module.exports = GoogleCalendarEvent