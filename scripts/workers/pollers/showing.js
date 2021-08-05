const {
  finalizeRecentlyDone,
  sendEmailNotification,
} = require('../../../lib/models/Showing/appointment/poller')
const { poll, shutdown } = require('../utils/poll')

function start () {
  poll({
    fn: finalizeRecentlyDone,
    name: 'Showing.appointment.finalizeRecentlyDone',
    wait: 15 * 60000, // 15 min
  })

  poll({
    fn: sendEmailNotification,
    name: 'Showing.appointment.sendEmailNotification',
    wait: 60000, // 1 min
  })
}

module.exports = { start, shutdown }
