/**
 * @namespace GoogleCalendarEvent
 */

const GoogleCalendarEvent = {
  ...require('./get'),
  ...require('./create'),
  ...require('./update'),
  ...require('./action'),
  ...require('./delete')
}

module.exports = GoogleCalendarEvent