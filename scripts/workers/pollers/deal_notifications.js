const Task = require('../../../lib/models/Task/notifications')
const { poll } = require('../poll')
require('./entrypoint')

poll({
  fn: Task.sendNotifications,
  name: 'Task.sendNotifications'
})
