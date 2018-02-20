const db = require('../../utils/db.js')
const squel = require('squel').useFlavour('postgres')
const promisify = require('../../utils/promisify')
const validator = require('../../utils/validator.js')
const _ = require('lodash')

const expect = validator.expect

const { taskSchema: schema, getAllOptionsSchema } = require('./schemas.js')

const Reminder = require('./Reminder')

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
  },

  reminders: {
    enabled: false,
    model: 'Reminder',
    collection: true
  }
}

const validate = validator.promise.bind(null, schema)
const validateOptions = validator.promise.bind(null, getAllOptionsSchema)

const Task = {
  associations,

  /**
   * Get a task by id
   * @param {UUID} id Task id to fetch
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
    const res = await db.query.promise('crm/task/get', [
      ids,
      ObjectUtil.getCurrentUser()
    ])

    for (const row of res.rows) {
      if (!row.reminders)
        row.reminders = []
    }

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

    if (options.limit)
      q.limit(options.limit)
    
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
   * @param {ITaskInput} task Task object to be created
   * @returns {Promise<ITask>}
   */
  async create(task) {
    await validate(task)

    const user_id = ObjectUtil.getCurrentUser()
    const due_date = new Date(task.due_date)

    const res = await db.query.promise('crm/task/insert', [
      user_id,
      user_id,
      task.title,
      task.description,
      due_date,
      task.status || 'PENDING',
      task.task_type,
      task.contact,
      task.deal,
      task.listing
    ])

    const added = await Task.get(res.rows[0].id)

    if (task.reminders) {
      for (const reminder of task.reminders) {
        await Reminder.create(reminder, added)
      }
    }

    return Task.get(res.rows[0].id)
  },

  /**
   * Deletes a task by id. Also deletes any reminders associated with it.
   * @param {UUID} task_id Task ID to remove
   * @returns {Promise<any>}
   */
  async remove(task_id) {
    const user_id = ObjectUtil.getCurrentUser()

    const task = await Task.get(task_id)

    const res = await db.query.promise('crm/task/delete', [
      task_id,
      user_id,
    ])

    if (task.reminders) {
      for (const reminder_id of task.reminders) {
        await Reminder.remove(reminder_id)
      }
    }

    return res
  },

  /**
   * Updates a task
   * @param {UUID} task_id Id of the task to be updated
   * @param {ITaskInput} task Task object to replace the old data
   * @returns {Promise<ITask>}
   */
  async update(task_id, task) {
    await validate(task)

    const user_id = ObjectUtil.getCurrentUser()
    const due_date = new Date(task.due_date)

    await db.query.promise('crm/task/update', [
      task_id,
      user_id,
      task.title,
      task.description,
      due_date,
      task.status,
      task.task_type,
      task.contact,
      task.deal,
      task.listing
    ])

    const updatedTask = await Task.get(task_id)

    await Task.updateReminders(updatedTask, task.reminders || [])

    return Task.get(task_id)
  },

  /**
   * Differentiates old and new reminders in the task data object
   * @param {ITask} task The existing task data object
   * @param {IReminderInput[]} reminders Array of final reminders to be replaced into the parent task
   */
  async updateReminders(task, reminders = []) {
    expect(reminders).to.be.an('array')

    const toAdd = reminders.filter(r => !r.id)
    const toUpdate = reminders.filter(r => r.id)
    const toKeepIds = toUpdate.map(r => r.id)
    const toRemoveIds = (task.reminders || []).filter(rid => !toKeepIds.includes(rid))

    for (const rid of toRemoveIds) {
      await Reminder.remove(rid)
    }

    for (const reminder of toUpdate) {
      await Reminder.update(reminder, task)
    }

    for (const reminder of toAdd) {
      await Reminder.create(reminder, task)
    }
  },

  publicize(data) {
    data.due_date = new Date(data.due_date).getTime()
  },

  /**
   * Creates notifications for reminders that are due now
   * @internal
  */
  async sendReminderNotifications() {
    const res = await db.query.promise('crm/reminder/now', [])
    const reminders = await Reminder.getAll(res.rows.map(row => row.id))
    const tasks = await Task.getAll(reminders.map(r => r.task))
    const taskIndex = _.keyBy(tasks, 'id')

    for (const reminder of reminders) {
      if (taskIndex[reminder.task]) {
        /** @type {INotification} */
        const n = {
          action: 'IsDue',
          subject: reminder.id,
          subject_class: 'Reminder',
          object: reminder.task,
          object_class: 'CrmTask',
          specific: taskIndex[reminder.task].assignee,
          message: 'TaskReminderForUser'
        }

        Notification.create(n, (err, notification) => {
          if (err)
            return

          Reminder.patchNotification(reminder, notification.id)
        })
      }
    }
  }
}

Orm.register('crm_task', 'CrmTask', Task)

module.exports = Task