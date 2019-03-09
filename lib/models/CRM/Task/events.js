const { enqueueJob } = require('../../../utils/worker')

const Assignee = require('./assignee')

async function onTaskAssigneeCreated({ assignees }) {
  enqueueJob('tasks', 'send_notification_to_task_assignees', { assignees })
}

module.exports = function attachEventHandlers() {
  Assignee.on('create', onTaskAssigneeCreated)
}
