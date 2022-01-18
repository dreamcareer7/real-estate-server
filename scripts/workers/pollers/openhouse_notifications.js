const { openhouseWorker } = require('../../../lib/models/Listing/notify-agents')
const { poll } = require('../utils/poll')

function start() {
  poll({
    fn: openhouseWorker,
    name: 'openhouse.notifications',
  })
}

module.exports = {
  start,
  shutdown: require('../utils/poll').shutdown
}
