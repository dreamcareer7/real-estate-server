/**
 * @namespace MicrosoftCalendar
 */

const MicrosoftCalendar = {
  ...require('./get'),
  ...require('./update'),
  ...require('./create'),
  ...require('./upsert'),
  ...require('./delete')
}

module.exports = MicrosoftCalendar