const promisify = require('../../../utils/promisify')
const db = require('../../../utils/db')
const squel = require('../../../utils/squel_extensions')
const Notification = require('../../Notification')
const Context = require('../../Context')

class TaskAssigneeClass {
  /**
   * Creates assignees for a task
   * @param {ITask} task 
   * @param {UUID[]} users 
   * @param {UUID} created_by 
   */
  async create(task, users, created_by) {
    if (!Array.isArray(users) || users.length === 0) return []

    const assignees = users.map(user => ({
      crm_task: task.id,
      user,
      created_by
    }))

    const q = squel
      .insert({ autoQuoteFieldNames: true, nameQuoteCharacter: '"' })
      .into('crm_tasks_assignees')
      .setFieldsRows(assignees)
      .returning('user')

    q.name = 'crm/task/assignee/create'
    const ids = await db.selectIds(q)

    /** @type {INotificationInput} */
    const n = {
      action: 'Assigned',
      subject: created_by,
      subject_class: 'User',
      object: task.id,
      object_class: 'CrmTask',
      title: task.title,
      message: ''
    }

    Context.log('>>> (CrmTask::Assignee::create)', 'Creating UserAssignedCrmTask notification on task', task.id)
    await promisify(Notification.issueForUsersExcept)(n, ids, created_by, {})

    return ids
  }

  /**
   * @param {UUID} task_id 
   */
  getForTask(task_id) {
    return db.select('crm/task/assignee/get_by_task', [task_id])
  }

  /**
   * @param {UUID} user_id 
   */
  getForUser(user_id) {
    return db.select('crm/task/assignee/get_by_user', [user_id])
  }

  /**
   * @param {UUID[]} ids 
   */
  delete(ids, user_id) {
    if (!Array.isArray(ids) || ids.length === 0) return 0

    return db.update('crm/task/assignee/delete', [
      ids,
      user_id
    ])
  }
}

TaskAssigneeClass.prototype.associations = {
  user: {
    model: 'User',
    enabled: false
  }
}

const TaskAssignee = new TaskAssigneeClass

module.exports = TaskAssignee
