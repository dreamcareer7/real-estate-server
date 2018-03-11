const _ = require('lodash')
const squel = require('squel').useFlavour('postgres')

const db = require('../../../utils/db.js')
const promisify = require('../../../utils/promisify')
const validator = require('../../../utils/validator.js')
const belt = require('../../../utils/belt')

const Orm = require('../../Orm')
const TaskAccess = require('./access')
const TaskAssociations = require('./association')

const expect = validator.expect

const { taskSchema: schema, getAllOptionsSchema } = require('../schemas.js')

const Reminder = require('../Reminder')
const CrmAssociation = require('../Association')

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

class Task {
  /**
   * Validates Task object
   * @param {ITaskInput} task Input Task object
   */
  static async validate(task) {
    await validator.promise(schema, task)

    if (task.associations) {
      for (const assoc of task.associations) {
        await CrmAssociation.validate(assoc)
      }
    }
  }

  /**
   * Get a task by id
   * @param {UUID} id Task id to fetch
   */
  static async get(id) {
    const tasks = await Task.getAll([id])

    if (!tasks || tasks.length < 1) {
      raiseNotFound(id)
    }

    return tasks[0]
  }

  /**
   * Get multiple tasks by id
   * @param {UUID[] | undefined} ids Array of task ids to fetch
   * @param {boolean} skip_associations Skip fetching associations
   * @returns {Promise<ITask[]>}
   */
  static async getAll(ids, skip_associations = false) {
    const tasks = await db.select('crm/task/get', [
      ids
    ])

    if (!skip_associations) {
      const association_ids = _.flatMap(tasks, t => t.associations)
      const associations = await CrmAssociation.getAll(association_ids)
      const associations_index = _.groupBy(associations, 'crm_task')

      for (const row of tasks) {
        if (!row.reminders) 
          row.reminders = []

        row.contacts = []
        row.deals = []
        row.listings = []

        if (Array.isArray(associations_index[row.id])) {
          for (const assoc of associations_index[row.id]) {
            switch (assoc.association_type) {
              case 'deal':
                row.deals.push(assoc.deal)
                break
              case 'listing':
                row.listings.push(assoc.listing)
                break
              case 'contact':
                row.contacts.push(assoc.contact)
                break
              default:
                break
            }
          }
        }
      }
    }

    return tasks
  }

  /**
   * Get all tasks assigned to current user
   * @param {UUID} user_id Id of the user requesting this data
   * @param {ITaskFilters & PaginationOptions} options filter and pagination options
   * @returns {Promise<ITask[]>}
   */
  static async getForUser(user_id, options) {
    const result = await Task.filter(user_id, options)
    const tasks = await Task.getAll(result.ids)

    if (tasks.length === 0)
      return []

    tasks[0].total = result.total
    return tasks
  }

  /**
   * Paginate, sort and filter tasks by various options.
   * @param {UUID} user_id User id requesting tasks
   * @param {ITaskFilters & PaginationOptions} options filter and pagination options
   * @returns {Promise<IIdCollectionResponse>}
   */
  static async filter(user_id, options) {
    await validateOptions(options)

    const q = squel.select()
      .field('id')
      .field('COUNT(*) OVER()::INT', 'total')
      .from('crm_tasks')
      .where('deleted_at IS NULL')
      .where(TaskAccess.readAccessQuery(user_id))

    CrmAssociation.associationQuery(q, 'crm_task', options)

    if (options.task_type)
      q.where('task_type = ?', options.task_type)
    
    if (options.q) {
      q.where(`to_tsvector('english',
                   COALESCE(title, '') || ' ' ||
                   COALESCE(description, '') 
                  )
                  @@ plainto_tsquery('english', ?)`, options.q)
    }

    if (options.status)
      q.where('status = ?', options.status)

    if (options.due_gte)
      q.where('due_date >= TIMESTAMP WITH TIME ZONE \'EPOCH\' + ? * INTERVAL \'1 SECOND\'', options.due_gte)

    if (options.due_lte)
      q.where('due_date <= TIMESTAMP WITH TIME ZONE \'EPOCH\' + ? * INTERVAL \'1 SECOND\'', options.due_lte)
    
    if (options.order) {
      if ('+-'.indexOf(options.order[0]) > -1)
        q.order(options.order.substring(1), options.order[0] !== '-')
      else
        q.order(options.order)
    }

    if (options.start)
      q.offset(options.start)

    if (options.limit)
      q.limit(options.limit)

    const res = await promisify(db.executeSql)(q.toString(), [])

    if (res.rows.length === 0)
      return {
        ids: [],
        total: 0
      }

    return {
      ids: res.rows.map(r => r.id),
      total: res.rows[0].total
    }
  }

  /**
   * Create a task
   * @param {ITaskInput} task Task object to be created
   * @param {UUID} user_id Creator of the task
   * @returns {Promise<ITask>}
   */
  static async create(task, user_id) {
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
        await Task.Associations.create(assoc, id)
      }
    }

    return Task.get(id)
  }

  /**
   * Deletes a task by id. Also deletes any reminders associated with it.
   * @param {UUID} task_id Task ID to remove
   * @returns {Promise<any>}
   */
  static async remove(task_id, user_id) {
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
  }

  /**
   * Updates a task
   * @param {UUID} task_id Id of the task to be updated
   * @param {ITaskInput} task Task object to replace the old data
   * @param {UUID} user_id Id of the the user requesting the update
   * @returns {Promise<ITask>}
   */
  static async update(task_id, task, user_id) {
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
  }

  /**
   * Differentiates old and new reminders in the task data object
   * @param {ITask} task The existing task data object
   * @param {IReminderInput[]} reminders Array of final reminders to be replaced into the parent task
   */
  static async updateReminders(task, reminders = []) {
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
  }
}

// Oh, God! Kill me!
Task.associations = associations
Task.Associations = TaskAssociations
Task.Access = TaskAccess

Orm.register('crm_task', 'CrmTask', Task)

module.exports = Task