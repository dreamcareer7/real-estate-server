const { enqueueJob } = require('../../../utils/worker')

const Assignee = require('./assignee')
const CrmTask = require('./index')

const Context = require('../../Context')
const Socket = require('../../Socket')

async function onTaskAssigneeCreated({ created_by, assignees }) {
  if (!created_by) throw 'Expected assignee.created_by to be UUID'

  enqueueJob('tasks', 'send_notification_to_task_assignees', { created_by, assignees })
}

async function onTaskCreated({ user_id, brand_id, task_ids }) {
  Socket.send(
    'crm_task:create',
    brand_id,
    [{ user_id, brand_id, task_ids }],

    err => {
      if (err) Context.error('>>> (Socket) Error sending task failure socket event.', err)
    }
  )
}

async function onTaskDeleted({ user_id, brand_id, task_ids }) {
  Socket.send(
    'crm_task:delete',
    brand_id,
    [{ user_id, brand_id, task_ids }],

    err => {
      if (err) Context.error('>>> (Socket) Error sending task failure socket event.', err)
    }
  )
}

module.exports = function attachEventHandlers() {
  CrmTask.on('create', onTaskCreated)
  CrmTask.on('delete', onTaskDeleted)
  Assignee.on('create', onTaskAssigneeCreated)
}
