const Trigger = require('../../../lib/models/Trigger/due')
const { poll } = require('../utils/poll')

function start() {
  poll({
    fn: Trigger.executeDue,
    name: 'Trigger.executeDue',
  })
}

module.exports = {
  start,
  shutdown: require('../utils/poll').shutdown
}
