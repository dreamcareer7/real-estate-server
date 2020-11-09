/**
 * @namespace CalendarIntegration
 */


const CalendarIntegration = {
  ...require('./get'),
  ...require('./insert'),
  ...require('./delete'),
  ...require('./update')
}


module.exports = CalendarIntegration