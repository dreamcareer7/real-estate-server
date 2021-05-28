const CrmTaskWorker = require('../../../lib/models/CRM/Task/worker/notification')
const { poll } = require('../utils/poll')

function start() {
  poll({
    fn: CrmTaskWorker.sendNotifications.bind(CrmTaskWorker),
    name: 'CrmTaskWorker.sendNotifications',
  })
}

module.exports = {
  start,
  shutdown: require('../utils/poll').shutdown
}
