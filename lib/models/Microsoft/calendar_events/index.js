/**
 * @namespace MicrosoftCalendarEvent
 */

const MicrosoftCalendarEvent = {
  ...require('./get'),
  ...require('./create'),
  ...require('./action'),
  ...require('./delete')
}

module.exports = MicrosoftCalendarEvent