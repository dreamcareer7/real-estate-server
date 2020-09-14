/**
 * @namespace GoogleCalendar
 */

const GoogleCalendar = {
  ...require('./get'),
  ...require('./update'),
  ...require('./create'),
  ...require('./upsert'),
  ...require('./delete')
}

module.exports = GoogleCalendar