const Task = require('../../../lib/models/Task/notifications')
const { poll } = require('../utils/poll')

function start() {
  poll({
    fn: Task.sendNotifications,
    name: 'Task.sendNotifications',
  })
}

module.exports = {
  start,
  shutdown: require('../utils/poll').shutdown
}
