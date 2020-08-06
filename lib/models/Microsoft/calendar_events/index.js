/**
 * @namespace MicrosoftCalendarEvent
 */

const MicrosoftCalendarEvent = {
  ...require('./get'),
  ...require('./upsert')
}

module.exports = MicrosoftCalendarEvent