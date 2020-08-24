const CalendarWorker = require('../../../lib/models/Calendar/worker/notification')
const { poll } = require('../poll')
require('./entrypoint')

poll({
  fn: CalendarWorker.sendEmailForUnread.bind(CalendarWorker),
  name: 'CalendarWorker.sendEmailForUnread'
})
