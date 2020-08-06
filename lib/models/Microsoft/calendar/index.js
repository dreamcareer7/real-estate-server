/**
 * @namespace MicrosoftCalendar
 */

const MicrosoftCalendar = {
  ...require('./get'),
  ...require('./upsert')
}

module.exports = MicrosoftCalendar