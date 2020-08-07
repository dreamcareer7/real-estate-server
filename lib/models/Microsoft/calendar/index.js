/**
 * @namespace MicrosoftCalendar
 */

const MicrosoftCalendar = {
  ...require('./get'),
  ...require('./upsert'),
  ...require('./delete')
}

module.exports = MicrosoftCalendar