/**
 * @namespace MicrosoftCalendarEvent
 */

const MicrosoftCalendarEvent = {
  ...require('./get'),
  ...require('./upsert'),
  ...require('./delete')
}

module.exports = MicrosoftCalendarEvent