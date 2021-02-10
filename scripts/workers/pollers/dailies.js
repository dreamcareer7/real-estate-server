const Daily = require('../../../lib/models/Daily')
const { poll } = require('../utils/poll')

function start() {
  poll({
    fn: Daily.sendDue,
    name: 'Daily.sendDue',
  })
}

module.exports = {
  start,
  shutdown: require('../utils/poll').shutdown
}
