const db = require('../../utils/db.js')

function raiseNotFound(id) {
  throw Error.ResourceNotFound(`Task ${id} not found`)
}

const associations = {
  contact: {
    model: 'Contact'
  },

  assignee: {
    model: 'User'
  },

  listing: {
    model: 'Listing'
  },

  created_by: {
    enabled: false,
    model: 'User'
  }
}

const Task = {
  associations,

  /**
   * Get a task by id
   * @param {UUID} user_id 
   * @param {UUID} id
   */
  async get(id) {
    const tasks = await Task.getAll([id])

    if (!tasks || tasks.length < 1) {
      raiseNotFound(id)
    }

    return tasks[0]
  },

  /**
   * Get multiple tasks by id
   * @param {UUID[] | undefined} ids Array of task ids to fetch
   * @param {ITaskFilters} filter Associations to filter by
   * @param {PaginationOptions} pagination Start index and page size
   * @returns {Promise<ITask[]>}
   */
  async getAll(ids, filter = {}, pagination = {}) {
    const user_id = ObjectUtil.getCurrentUser()

    const res = await db.query.promise('crm/task/get', [
      ids,
      user_id,
      filter.contact,
      filter.deal,
      filter.listing,
      pagination.start || 0,
      pagination.size || 100
    ])

    return res.rows
  },

  /**
   * Get all tasks assigned to current user
   * @param {ITaskFilters} filter Associations to filter by
   * @param {PaginationOptions} pagination Start index and page size
   * @returns {Promise<ITask[]>}
   */
  getForUser(filter = {}, pagination = {}) {
    return Task.getAll(undefined, filter, pagination)
  },

  /**
   * Create a task
   * @param {ITask} task Task object to be created
   */
  async create(task) {
    task.assignee = ObjectUtil.getCurrentUser()

    const res = await db.query.promise('crm/task/insert', [
      task.assignee,
      task.assignee,
      task.title,
      task.description,
      task.due_date,
      task.status,
      task.task_type,
      task.contact,
      task.deal,
      task.listing
    ])
  
    return Task.get(res.rows[0].id)  
  },

  /**
   * Deletes a task by id. Also deletes any reminders associated with it.
   * @param {UUID} task_id Task ID to remove
   * @returns {Promise<void>}
   */
  async remove(task_id) {
    const user_id = ObjectUtil.getCurrentUser()

    await Task.get(task_id)

    return db.query.promise('crm/task/delete', [
      task_id,
      user_id,
    ])
  },

  async patch(task_id, task) {
    const user_id = ObjectUtil.getCurrentUser()

    await Task.get(task_id)

    return db.query.promise('crm/task/patch', [
      task_id,
      user_id,
      task.title,
      task.description,
      task.due_date,
      task.status,
      task.task_type,
      task.contact,
      task.deal,
      task.listing
    ])
  }
}

Orm.register('crm_task', 'CrmTask', Task)

module.exports = Task