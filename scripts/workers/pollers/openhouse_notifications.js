const { openhouseWorker } = require('../../../lib/models/OpenHouse/worker')
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
