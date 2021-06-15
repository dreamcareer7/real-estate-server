const { finalizeRecentlyDone } = require('../../../lib/models/Showing/appointment/poller')
const { poll, shutdown } = require('../utils/poll')

function start () {
  poll({
    fn: finalizeRecentlyDone,
    name: 'Showing.appointment.finalizeRecentlyDone',
    wait: 15 * 60000 // 15 min
  })
}

module.exports = { start, shutdown }
