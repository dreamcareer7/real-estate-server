const { enqueueJob } = require('../../../utils/worker')

const Assignee = require('./assignee')

async function onTaskAssigneeCreated({ created_by, assignees }) {
  enqueueJob('tasks', 'send_notification_to_task_assignees', { created_by, assignees })
}

module.exports = function attachEventHandlers() {
  Assignee.on('create', onTaskAssigneeCreated)
}
