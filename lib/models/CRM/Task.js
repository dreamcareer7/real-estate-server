const db = require('../../utils/db.js')
const squel = require('squel').useFlavour('postgres')
const promisify = require('../../utils/promisify')
const validator = require('../../utils/validator.js')
const _ = require('lodash')
const belt = require('../../utils/belt')

const Notification = require('../Notification')
const Orm = require('../Orm')

const expect = validator.expect

const { taskSchema: schema, getAllOptionsSchema } = require('./schemas.js')

const Reminder = require('./Reminder')
const CrmAssociation = require('./Association')

function raiseNotFound(id) {
  throw Error.ResourceNotFound(`Task ${id} not found`)
}

const associations = {
  assignee: {
    enabled: false,
    model: 'User'
  },

  associations: {
    enabled: false,
    collection: true,
    model: 'CrmAssociation'
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

const validateOptions = validator.promise.bind(null, getAllOptionsSchema)

const Task = {
  associations,

  /**
   * Validates Task object
   * @param {ITaskInput} task Input Task object
   */
  async validate(task) {
    await validator.promise(schema, task)

    if (task.associations) {
      for (const assoc of task.associations) {
        await CrmAssociation.validate(assoc)
      }
    }
  },

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
    const tasks = await db.select('crm/task/get', [
      ids
    ])

    for (const row of tasks) {
      if (!row.reminders)
        row.reminders = []
    }

    return tasks
  },

  /**
   * Get all tasks assigned to current user
   * @param {UUID} user_id Id of the user requesting this data
   * @param {ITaskFilters & PaginationOptions} options filter and pagination options
   * @returns {Promise<ITask[]>}
   */
  async getForUser(user_id, options) {
    options.assignee = user_id
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
    
    CrmAssociation.associationQuery(q, 'crm_task', options)
    
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
   * @param {UUID} user_id Creator of the task
   * @returns {Promise<ITask>}
   */
  async create(task, user_id) {
    await Task.validate(task)

    const due_date = belt.epochToDate(task.due_date)

    const id = await db.insert('crm/task/insert', [
      user_id,
      user_id,
      task.title,
      task.description,
      due_date,
      task.status || 'PENDING',
      task.task_type
    ])

    const added = await Task.get(id)

    if (task.reminders) {
      for (const reminder of task.reminders) {
        await Reminder.create(reminder, added)
      }
    }

    if (Array.isArray(task.associations)) {
      for (const assoc of task.associations) {
        await Task.addAssociation(assoc, id)
      }
    }

    return Task.get(id)
  },

  /**
   * Deletes a task by id. Also deletes any reminders associated with it.
   * @param {UUID} task_id Task ID to remove
   * @returns {Promise<any>}
   */
  async remove(task_id, user_id) {
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
   * @param {UUID} user_id Id of the the user requesting the update
   * @returns {Promise<ITask>}
   */
  async update(task_id, task, user_id) {
    await Task.validate(task)

    const due_date = belt.epochToDate(task.due_date)

    await db.query.promise('crm/task/update', [
      task_id,
      user_id,
      task.title,
      task.description,
      due_date,
      task.status,
      task.task_type
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

  /**
   * Creates notifications for reminders that are due now
   * @internal
  */
  async sendReminderNotifications() {
    const ids = await db.selectIds('crm/reminder/now', [])
    const reminders = await Reminder.getAll(ids)
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

        const notification = await promisify(Notification.create)(n)
        await Reminder.patchNotification(reminder.id, notification.id)  
      }
    }
  },

  /**
   * Creates notifications for tasks that are due now
   * @internal
  */
  async sendTaskDueNotifications() {
    const ids = await db.selectIds('crm/task/now', [])
    const tasks = await Task.getAll(ids)

    for (const task of tasks) {
      /** @type {INotification} */
      const n = {
        action: 'IsDue',
        subject: task.id,
        subject_class: 'CrmTask',
        object: task.id,
        object_class: 'CrmTask',
        specific: task.assignee,
        message: 'TaskIsDueForUser'
      }

      const notification = await promisify(Notification.create)(n)
      await Task.patchNotification(task.id, notification.id)
    }
  },

  /**
   * Patches notification id of a task after sending TaskIsDue notification
   * @param {UUID} task_id
   * @param {UUID} notification_id 
   * @private
   */
  patchNotification(task_id, notification_id) {
    return db.query.promise('crm/task/patch_notification', [
      task_id,
      notification_id
    ])
  },

  /**
   * Fetches all association objects for a task
   * @param {UUID} task_id Parent task id
   */
  getAssociations(task_id) {
    return CrmAssociation.getForParentRecord('crm_task', task_id)
  },

  /**
   * Adds an association to a task
   * @param {ICrmAssociationInput} association Association object
   * @param {UUID} task_id Parent task's id
   */
  addAssociation(association, task_id) {
    association.crm_task = task_id
    return CrmAssociation.create(association)
  },

  /**
   * Remove an association from a task
   * @param {UUID} association_id
   * @param {UUID} task_id 
   */
  removeAssociation(association_id, task_id) {
    return CrmAssociation.remove(association_id, 'crm_task', task_id)
  }
}

Orm.register('crm_task', 'CrmTask', Task)

module.exports = Task