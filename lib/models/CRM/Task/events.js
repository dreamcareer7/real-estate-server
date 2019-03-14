const { enqueueJob } = require('../../../utils/worker')

const Assignee = require('./assignee')

async function onTaskAssigneeCreated({ created_by, assignees }) {
  if (!created_by) throw 'Expected assignee.created_by to be UUID'

  enqueueJob('tasks', 'send_notification_to_task_assignees', { created_by, assignees })
}

module.exports = function attachEventHandlers() {
  Assignee.on('create', onTaskAssigneeCreated)
}
