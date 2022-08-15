const { EventEmitter } = require('events')

const _ = require('lodash')

const db = require('../../../utils/db')
const squel = require('../../../utils/squel_extensions')

class TaskAssigneeClass extends EventEmitter {
  /**
   * Creates assignees for a task
   * @param {ITaskAssigneeInput[]} assignees
   */
  async create(assignees) {
    if (!Array.isArray(assignees) || assignees.length === 0) return []
    if (assignees.some(a => !a.created_by)) throw 'Expected assignee.created_by to be a UUID'

    const data = assignees.map(assignee => ({
      crm_task: assignee.crm_task,
      user: assignee.user,
      created_by: assignee.created_by
    }))

    const LIBPQ_PARAMETER_LIMIT = 0xFFFF

    /** @type {ITaskAssignees[][]} */
    const res = await Promise.all(_(data)
      .chunk(Math.floor(LIBPQ_PARAMETER_LIMIT / Object.keys(data[0]).length))
      .map((chunk, i) => {
        const q = squel.select()
          .with('added', squel.insert({ autoQuoteFieldNames: true, nameQuoteCharacter: '"' })
            .into('crm_tasks_assignees')
            .setFieldsRows(chunk)
            .returning('user')
            .returning('crm_task')
          )
          .field('crm_task')
          .field('array_agg("user")', 'users')
          .from('added')
          .group('crm_task')

        // @ts-ignore
        q.name = `crm/task/assignee/create#${i}`

        return db.select(q)
      })
      .value()
    )

    this.emit('create', { created_by: data[0].created_by, assignees: res.flat() })

    return res
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
   * Deletes all assignees for tasks
   * @param {UUID[]} task_ids 
   * @param {UUID} deleted_by 
   */
  deleteForTasks(task_ids, deleted_by) {
    return db.update('crm/task/assignee/delete_for_tasks', [
      task_ids,
      deleted_by
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
