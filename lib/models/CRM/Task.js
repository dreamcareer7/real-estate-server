const db = require('../../utils/db.js')
const squel = require('squel').useFlavour('postgres')
const promisify = require('../../utils/promisify')
const validator = require('../../utils/validator.js')
const { taskSchema: schema, getAllOptionsSchema } = require('./schemas.js')

function raiseNotFound(id) {
  throw Error.ResourceNotFound(`Task ${id} not found`)
}

const associations = {
  contact: {
    enabled: false,
    model: 'Contact'
  },

  assignee: {
    enabled: false,
    model: 'User'
  },

  listing: {
    enabled: false,
    model: 'Listing'
  },

  created_by: {
    enabled: false,
    model: 'User'
  }
}

const validate = validator.promise.bind(null, schema)
const validateOptions = validator.promise.bind(null, getAllOptionsSchema)

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
   * @returns {Promise<ITask[]>}
   */
  async getAll(ids) {
    const user_id = ObjectUtil.getCurrentUser()

    const res = await db.query.promise('crm/task/get', [
      ids,
      user_id
    ])

    return res.rows
  },

  /**
   * Get all tasks assigned to current user
   * @param {ITaskFilters & PaginationOptions} options filter and pagination options
   * @returns {Promise<ITask[]>}
   */
  async getForUser(options) {
    options.assignee = ObjectUtil.getCurrentUser()
    const task_ids = await Task.filter(options)

    return Task.getAll(task_ids)
  },

  /**
   * Paginate, sort and filter tasks by various options.
   * @param {ITaskFilters & PaginationOptions} options filter and pagination options
   * @returns {Promise<UUID[]>}
   */
  async filter(options) {
    await validateOptions(options)

    const q = squel.select()
      .field('id')
      .from('crm_tasks')
      .where('deleted_at IS NULL')

    if (options.contact)
      q.where('contact = ?', options.contact)

    if (options.deal)
      q.where('deal = ?', options.deal)

    if (options.listing)
      q.where('listing = ?', options.listing)

    if (options.task_type)
      q.where('task_type = ?', options.task_type)

    if (options.status)
      q.where('status = ?', options.status)

    if (options.due_gte)
      q.where('due_date >= TIMESTAMP WITH TIME ZONE \'EPOCH\' + ? * INTERVAL \'1 MICROSECOND\'', options.due_gte)

    if (options.due_lte)
      q.where('due_date <= TIMESTAMP WITH TIME ZONE \'EPOCH\' + ? * INTERVAL \'1 MICROSECOND\'', options.due_lte)

    if (options.start)
      q.offset(options.start)

    if (options.size)
      q.limit(options.size)
    
    if (options.order) {
      if ('+-'.indexOf(options.order[0]) > -1)
        q.order(options.order.substring(1), options.order[0] !== '-')
      else
        q.order(options.order)
    }

    const res = await promisify(db.executeSql)(q.toString(), [])

    return res.rows.map(r => r.id)
  },

  /**
   * Create a task
   * @param {ITask} task Task object to be created
   */
  async create(task) {
    await validate(task)

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

  /**
   * Updates a task
   * @param {UUID} task_id Id of the task to be updated
   * @param {ITask} task 
   */
  async update(task_id, task) {
    await validate(task)

    const user_id = ObjectUtil.getCurrentUser()

    await db.query.promise('crm/task/patch', [
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

    return Task.get(task_id)
  }
}

Orm.register('crm_task', 'CrmTask', Task)

module.exports = Task