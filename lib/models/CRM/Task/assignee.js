const db = require('../../../utils/db')
const squel = require('../../../utils/squel_extensions')

class TaskAssigneeClass {
  /**
   * Creates assignees for a task
   * @param {UUID} task 
   * @param {UUID[]} users 
   * @param {UUID} created_by 
   */
  create(task, users, created_by) {
    if (!Array.isArray(users) || users.length === 0) return []

    const assignees = users.map(user => ({
      crm_task: task,
      user,
      created_by
    }))

    const q = squel
      .insert({ autoQuoteFieldNames: true, nameQuoteCharacter: '"' })
      .into('crm_tasks_assignees')
      .setFieldsRows(assignees)
      .returning('id')

    q.name = 'crm/task/assignee/create'
    return db.selectIds(q)
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
