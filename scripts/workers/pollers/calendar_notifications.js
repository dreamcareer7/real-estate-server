const CalendarWorker = require('../../../lib/models/Calendar/worker/notification')
const { poll } = require('../utils/poll')

function start() {
  poll({
    fn: CalendarWorker.sendEmailForUnread.bind(CalendarWorker),
    name: 'CalendarWorker.sendEmailForUnread',
  })
}

module.exports = {
  start,
  shutdown: require('../utils/poll').shutdown
}
