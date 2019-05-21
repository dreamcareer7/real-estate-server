const { EventEmitter } = require('events')

const _ = require('lodash')
const sq = require('@rechat/squel').useFlavour('postgres')

const db = require('../../../utils/db.js')
const promisify = require('../../../utils/promisify')
const validator = require('../../../utils/validator.js')
const belt = require('../../../utils/belt')

const Context = require('../../Context')
const Notification = require('../../Notification')
const Orm = require('../../Orm')

const expect = validator.expect

const { taskSchema: schema, getAllOptionsSchema } = require('./schemas.js')

const Assignee = require('./assignee')
const Reminder = require('./reminder')
const CrmAssociation = require('../Association')

function raiseNotFound(id) {
  throw Error.ResourceNotFound(`Task ${id} not found`)
}

const associations = {
  assignees: {
    enabled: false,
    model: 'User',
    collection: true
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

  updated_by: {
    enabled: false,
    model: 'User'
  },

  files: {
    collection: true,
    enabled: false,
    model: 'AttachedFile'
  },

  reminders: {
    enabled: false,
    model: 'Reminder',
    collection: true
  }
}

const validateOptions = validator.promise.bind(null, getAllOptionsSchema)

class TaskClass extends EventEmitter {
  /**
   * Validates Task object
   * @param {Partial<ITaskInput>} task Input Task object
   */
  async validate(task) {
    await validator.promise(schema, task)

    if (task.associations) {
      for (const assoc of task.associations) {
        await CrmAssociation.validate(assoc)
      }
    }
  }

  /**
   * Performs access control for the user on a number of task ids
   * @param {UUID} user_id User id requesting access
   * @param {UUID} user_id Brand id of owner team
   * @param {TAccessActions} op Action the user is trying to perform
   * @param {UUID[]} task_ids Task ids to perform access control
   * @returns {Promise<Map<UUID, boolean>>}
   */
  async hasAccess(user_id, brand_id, op, task_ids) {
    expect(task_ids).to.be.an('array')
    
    const access = op === 'read' ? 'read' : 'write'
    const rows = await db.select('crm/task/has_access', [
      Array.from(new Set(task_ids)),
      user_id,
      brand_id
    ])

    const foundIndex = _.keyBy(rows, 'id')

    const accessIndex = task_ids.reduce((index, tid) => {
      return index.set(tid, foundIndex.hasOwnProperty(tid) && foundIndex[tid][access])
    }, new Map)

    return accessIndex
  }

  /**
   * Get a task by id
   * @param {UUID} id Task id to fetch
   */
  async get(id) {
    const tasks = await this.getAll([id])

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
  async getAll(ids, skip_associations = false) {
    const tasks = await db.select('crm/task/get', [
      ids
    ])

    if (!skip_associations) {
      const association_ids = _.flatMap(tasks, t => t.associations)
      const associations_index = await CrmAssociation.getAllCategorizedByType(association_ids)

      for (const row of tasks) {
        if (!row.reminders) 
          row.reminders = []
        Object.assign(row, associations_index.get(row.id))
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
  async getForUser(user_id, brand_id, options) {
    const result = await this.filter(user_id, brand_id, options)
    const tasks = await this.getAll(result.ids)

    if (tasks.length === 0)
      return []

    // @ts-ignore
    tasks[0].total = result.total
    return tasks
  }

  /**
   * Paginate, sort and filter tasks by various options.
   * @param {UUID} user_id User id requesting tasks
   * @param {ITaskFilters & PaginationOptions} options filter and pagination options
   * @returns {Promise<IIdCollectionResponse>}
   */
  async filter(user_id, brand_id, options) {
    await validateOptions(options)

    const q = sq.select()
      .field('ct.id')
      .field('COUNT(*) OVER()::INT', 'total')
      .from('crm_tasks', 'ct')

    if (options.assignee) {
      q.join('crm_tasks_assignees', 'cta', 'ct.id = cta.crm_task')
      q.where('cta."user" = ?', options.assignee)
    }

    q.where('ct.deleted_at IS NULL')
      .where('check_task_read_access(ct.*, ?, ?)', user_id, brand_id)

    CrmAssociation.associationQuery(q, options)

    if (options.task_type)
      q.where('task_type = ?', options.task_type)

    if (Array.isArray(options.q)) {
      const q_expr = sq.expr()
      for (const term of options.q) {
        q_expr.and('searchable_field ILIKE ?', '%' + term + '%')
      }
      q.where(q_expr)
    }

    if (options.created_by)
      q.where('ct.created_by = ?', options.created_by)

    if (options.status)
      q.where('status = ?', options.status)

    if (options.due_gte)
      q.where('due_date >= to_timestamp(?)', options.due_gte)

    if (options.due_lte)
      q.where('due_date <= to_timestamp(?)', options.due_lte)

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

    const buildQuery = q.toParam()
    const res = await promisify(db.executeSql)(buildQuery.text, buildQuery.values)

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
   * @returns {Promise<ITask>}
   */
  async create(task) {
    await this.validate(task)

    const due_date = belt.epochToDate(task.due_date)

    const id = await db.insert('crm/task/insert', [
      task.created_by,
      task.brand,
      task.title,
      task.description,
      due_date,
      task.status || 'PENDING',
      task.task_type,
      task.metadata
    ])

    const added = await this.get(id)

    if (task.reminders) {
      for (const reminder of task.reminders) {
        await Reminder.create(reminder, added)
      }
    }

    if (task.assignees) {
      await Assignee.create(task.assignees.map(user => ({
        crm_task: added.id,
        user,
        created_by: task.created_by
      })))
    }

    if (Array.isArray(task.associations)) {
      const associations = task.associations.map(/** @returns {ICrmAssociationInput} */a => ({ ...a, created_by: task.created_by, brand: task.brand, task: id }))
      await CrmAssociation.createMany(associations)
    }

    this.emit('create', {
      user_id: task.created_by,
      brand_id: task.brand,
      task_ids: [id]
    })

    return this.get(id)
  }

  /**
   * Create multiple tasks
   * @param {ITaskInput[]} tasks 
   */
  async createMany(tasks) {
    Context.log(`Creating ${tasks.length} tasks`)
    const fields = [
      'created_by',
      'brand',
      'title',
      'description',
      'due_date',
      'status',
      'task_type',
      'metadata'
    ]

    const data = tasks.map(t => belt.ensureFields({...t}, fields, { status: 'PENDING' }, { due_date: d => belt.epochToDate(d).toISOString() }))

    const q = sq.insert({ autoQuoteAliasNames: true, autoQuoteFieldNames: true })
      .into('crm_tasks')
      .setFieldsRows(data)
      .returning('id')

    // @ts-ignore
    q.name = 'crm/task/create_many'

    const ids = await db.selectIds(q, [])

    const tasks_by_id = new Map
    for (let i = 0; i < ids.length; i++) {
      tasks[i].id = ids[i]
      tasks_by_id.set(ids[i], tasks[i])
    }

    const reminders = tasks
      .filter(/** @type {TIsRequirePropPresent<ITaskInput, 'reminders'>} */(t => Array.isArray(t.reminders)))
      .map(/** @returns {IReminderInput} */t => ({
        task: t.id,
        is_relative: t.reminders[0].is_relative,
        timestamp: t.reminders[0].timestamp,
        needs_notification: t.status !== 'DONE'
      }))

    await Reminder.createMany(reminders)

    const assignees = tasks
      .filter(/** @type {TIsRequirePropPresent<ITaskInput, 'assignees'>} */(t => Array.isArray(t.assignees)))
      .flatMap(t => t.assignees.map(/** @returns {ITaskAssigneeInput} */user => ({
        crm_task: /** @type {RequireProp<ITaskInput, 'id'>} */(t).id,
        user,
        created_by: t.created_by
      })))

    await Assignee.create(assignees)

    const associations = tasks
      .filter(/** @type {TIsRequirePropPresent<ITaskInput, 'associations'>} */(t => Array.isArray(t.associations)))
      .flatMap(t => t.associations.map(/** @returns {ICrmAssociationInput} */a => ({
        ...a,
        task: t.id,
        created_by: t.created_by,
        brand: t.brand
      })))

    await CrmAssociation.createMany(associations)

    this.emit('create', {
      user_id: tasks[0].created_by,
      brand_id: tasks[0].brand,
      task_ids: ids
    })

    return ids
  }

  /**
   * Deletes a task by id. Also deletes any reminders associated with it.
   * @param {UUID} task_id Task ID to remove
   * @returns {Promise<any>}
   */
  async remove(task_id, user_id) {
    const task = await this.get(task_id)

    const res = await db.query.promise('crm/task/delete', [
      task_id,
      user_id
    ])

    if (task.reminders) {
      for (const reminder_id of task.reminders) {
        await Reminder.remove(reminder_id)
      }
    }

    this.emit('delete', {
      user_id,
      brand_id: task.brand,
      task_ids: [task_id],
      task
    })

    return res
  }

  /**
   * Updates a task
   * @param {UUID} task_id Id of the task to be updated
   * @param {RequireProp<Partial<ITaskInput>, 'due_date'>} task Task object to replace the old data
   * @param {UUID} user_id
   * @returns {Promise<ITask>}
   */
  async update(task_id, task, user_id) {
    function fieldChanged(o, n, f) {
      return !_.isEqual(o[f], n[f])
    }

    function objectChanged(o, n, fs) {
      return fs.reduce((res, f) => res || fieldChanged(o, n, f), true)
    }

    await this.validate(task)

    const current = await this.get(task_id)

    const due_date = belt.epochToDate(task.due_date)
    const date_changed = fieldChanged(current, task, 'due_date')
    const meta_changed = fieldChanged(current, task, 'metadata')
    const status_changed = fieldChanged(current, task, 'status')
    const task_changed = objectChanged(current, task, [
      'title',
      'description',
      'due_date',
      'status'
    ])

    if (task_changed || meta_changed) {
      await db.update('crm/task/update', [
        task_id,
        task.title,
        task.description,
        due_date,
        task.status,
        task.task_type,
        task.metadata,
        user_id
      ])

      if (status_changed) {
        this.emit('update:status', {
          task_id,
          status: task.status
        })
      }

      this.emit('update', { task_id })
    }

    const updatedTask = task_changed ? (await this.get(task_id)) : current

    let associations_changed = false

    if (Array.isArray(task.associations)) {
      associations_changed = await this.updateAssociations(updatedTask, task.associations, user_id)
    }

    if (Array.isArray(task.reminders)) {
      await this.updateReminders(updatedTask, task.reminders || [])
    }

    if (Array.isArray(task.assignees)) {
      await this.updateAssignees(updatedTask, task.assignees, user_id)
    }

    if (task_changed || associations_changed) {
      /** @type {INotificationInput} */
      const n = {
        action: 'Edited',
        subject: user_id,
        subject_class: 'User',
        object: updatedTask.id,
        object_class: 'CrmTask',
        title: updatedTask.title,
        message: '',
        data: {
          date_changed
        }
      }

      Context.log('>>> (CrmTask::Update)', 'Creating UserEditedCrmTask notification on task', updatedTask.id)
      await promisify(Notification.issueForUsersExcept)(n, updatedTask.assignees, user_id, {})
    }

    return this.get(task_id)
  }

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
  }

  /**
   * Differentiates old and new associations in a task
   * @param {ITask} task The existing task data object
   * @param {ICrmTaskAssociationInputWithId[]} associations Array of final associations to be replaced into the parent task
   * @param {UUID} user_id Current user
   */
  async updateAssociations(task, associations, user_id) {
    expect(associations).to.be.an('array')

    const toAdd = associations.filter(a => !a.id).map(a => ({ ...a, task: task.id, created_by: user_id, brand: task.brand }))
    const toKeepIds = associations.filter(a => a.id).map(a => a.id)
    const toRemoveIds = (task.associations || []).filter(rid => !toKeepIds.includes(rid))

    await CrmAssociation.remove(toRemoveIds, task.id, user_id)
    await CrmAssociation.createMany(toAdd)

    return toAdd.length > 0 || toRemoveIds.length > 0
  }

  /**
   * Differentiates old and new assignees in the task data object
   * @param {ITask} task The existing task data object
   * @param {UUID[]} assignees Array of final assignee to be replaced into the parent task
   */
  async updateAssignees(task, assignees = [], user_id) {
    expect(assignees).to.be.an('array')

    const toAdd = _.difference(assignees, task.assignees).map(user => ({
      crm_task: task.id,
      user: user,
      created_by: user_id
    }))
    const toRemove = _.difference(task.assignees, assignees)

    await Assignee.create(toAdd)
    await Assignee.delete(toRemove, user_id)
  }

  /**
   * @param {ITask} task 
   */
  shouldUpdateLastTouch(task) {
    return task.task_type !== 'Other' && task.task_type !== 'Note'
  }

  /**
   * @param {ITask} task 
   */
  shouldReceiveNotification(task) {
    return task.task_type !== 'Note'
  }
}

TaskClass.prototype.associations = associations

const Task = new TaskClass

Orm.register('crm_task', 'CrmTask', Task)

module.exports = Task
