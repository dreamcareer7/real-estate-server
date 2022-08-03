const _ = require('lodash')
const sq        = require('../../../utils/squel_extensions')
const db        = require('../../../utils/db.js')
const promisify = require('../../../utils/promisify')
const belt      = require('../../../utils/belt')
const validator = require('../../../utils/validator.js')
const expect    = validator.expect

const Orm       = {
  ...require('../../Orm/index'),
  ...require('../../Orm/context'),
}

const Context      = require('../../Context')
const Notification = require('../../Notification/issue')

const CrmAssociation = require('../Association')
const emitter        = require('./emitter')

const Assignee = require('./assignee')
const Reminder = require('./reminder')
const { taskSchema: schema } = require('./schemas.js')

const { get, getAll } = require('./get')


/**
 * @param {ITask} o 
 * @param {Partial<ITaskInput>} n 
 * @param {keyof ITaskInput} f 
 */
function fieldChanged(o, n, f) {
  return !_.isEqual(o[f], n[f])
}

/**
 * @param {ITask} o 
 * @param {RequireProp<Partial<ITaskInput>, 'due_date'>} n 
 * @param {Array<keyof ITaskInput>} fs 
 */
function objectChanged(o, n, fs) {
  return fs.reduce((res, f) => res || fieldChanged(o, n, f), true)
}

/**
 * Validates Task object
 * @param {Partial<ITaskInput>} task Input Task object
 */
const validate = async (task) => {
  await validator.promise(schema, task)

  if (task.end_date)
    expect(task.due_date).to.be.lessThan(task.end_date)

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
const hasAccess = async (user_id, brand_id, op, task_ids) => {
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
 * Create a task
 * @param {RequireProp<ITaskInput, 'brand' | 'created_by'>} task Task object to be created
 * @param {string} _reason
 * @returns {Promise<ITask>}
 */
const create = async (task, _reason = 'direct_request') => {
  await validate(task)

  const due_date = belt.epochToDate(task.due_date)
  const end_date = task.end_date ? belt.epochToDate(task.end_date) : null

  const id = await db.insert('crm/task/insert', [
    task.created_by,
    task.brand,
    task.title,
    task.description,
    due_date,
    end_date,
    task.status || 'PENDING',
    task.task_type,
    task.metadata,
    task.all_day || false
  ])

  const added = await get(id)

  if (task.reminders) {
    await Reminder.createMany(task.reminders.map(r => ({
      ...r,
      task: added.id,
      needs_notification: task.status !== 'DONE'
    })))
  }

  if (task.assignees) {
    await Assignee.create(task.assignees.map(user => ({
      crm_task: added.id,
      user,
      created_by: task.created_by
    })))
  }

  if (Array.isArray(task.associations)) {
    const associations = task.associations
      .map(/** @returns {ICrmAssociationInput} */a =>
        ({ ...a, created_by: task.created_by, brand: task.brand, task: id })
      )
    await CrmAssociation.createMany(associations)
  }

  emitter.emit('create', {
    user_id: task.created_by,
    brand_id: task.brand,
    task_ids: [id],
    reason: _reason
  })

  return get(id)
}


/**
 * Create a task
 * @param {RequireProp<ITaskCloneInput, 'brand' | 'created_by'>} new_task_data Task object to be created
 * @param {string} original_task_id
 * @returns {Promise<ITask>}
 */

const clone = async (new_task_data, original_task_id) => {
  const original_associations = Orm.getEnabledAssociations()
  Orm.enableAssociation(['crm_task.reminders', 'crm_task.assignees'])

  const original_raw_task = await get(original_task_id)

  const [original_task] = await Orm.populate({
    models: [original_raw_task],
    associations: ['crm_task.reminders', 'crm_task.assignees']
  })

  Orm.setEnabledAssociations(original_associations)

  original_task.associations = await CrmAssociation.getForTask(original_task.id)

  /**@type {any} */
  const task_to_create = {
    ...original_task,
    ...new_task_data,
  }

  task_to_create.due_date = belt.epochToDate(task_to_create.due_date)

  const end_date = task_to_create.end_date
  task_to_create.end_date = end_date ? belt.epochToDate(end_date) : null

  const id = await db.insert('crm/task/insert', [
    task_to_create.created_by,
    task_to_create.brand,
    task_to_create.title,
    task_to_create.description,
    task_to_create.due_date,
    task_to_create.end_date,
    task_to_create.status,
    task_to_create.task_type,
    task_to_create.metadata,
    task_to_create.all_day,
  ])

  if (task_to_create.reminders) {
    await Reminder.createMany(task_to_create.reminders.map(r => ({
      ...r,
      task: id,
      needs_notification: task_to_create.status !== 'DONE'
    })))
  }

  if (task_to_create.assignees) {
    await Assignee.create(task_to_create.assignees.map(user => ({
      crm_task: id,
      user: typeof user === 'string' ? user : user.id,
      created_by: task_to_create.created_by
    })))
  }

  if (Array.isArray(task_to_create.associations)) {
    const associations = task_to_create.associations
      .map(/** @returns {ICrmAssociationInput} */a =>
        ({
          ...a,
          created_by: task_to_create.created_by,
          brand: task_to_create.brand,
          task: id
        })
      )
    await CrmAssociation.createMany(associations)
  }

  emitter.emit('create', {
    user_id: task_to_create.created_by,
    brand_id: task_to_create.brand,
    task_ids: [id],
  })

  return get(id)
}

/**
 * Create multiple tasks
 * @param {RequireProp<ITaskInput, 'brand' | 'created_by'>[]} tasks 
 * @param {string} _reason
 */
const createMany = async (tasks, _reason = 'direct_request') => {
  if (!Array.isArray(tasks) || tasks.length < 1) return []

  Context.log(`Creating ${tasks.length} tasks`)
  const fields = [
    'created_by',
    'brand',
    'title',
    'description',
    'due_date',
    'end_date',
    'status',
    'task_type',
    'metadata',
    'all_day'
  ]

  const data = tasks.map(t => ({
    ...belt.ensureFields({...t}, fields, { status: 'PENDING' }, {
      due_date: d => belt.epochToDate(d).toISOString(),
      end_date: d => d ? belt.epochToDate(d).toISOString() : null,
    }),
    metadata: JSON.stringify(t.metadata),
    needs_notification: true,
    all_day: t.all_day || false
  }))

  const LIBPQ_PARAMETER_LIMIT = 0xFFFF

  const result = await Promise.all(_(data)
    .chunk(Math.floor(LIBPQ_PARAMETER_LIMIT / Object.keys(data[0]).length))
    .map((chunk, i) => {
      const q = sq.insert({ autoQuoteAliasNames: true, autoQuoteFieldNames: true })
        .into('crm_tasks')
        .setFieldsRows(chunk)
        .returning('id')

      // @ts-ignore
      q.name = `crm/task/create_many#${i}`

      return db.selectIds(q)
    })
    .value())

  const ids = result.flat()

  const tasks_by_id = new Map
  for (let i = 0; i < ids.length; i++) {
    tasks[i].id = ids[i]
    tasks_by_id.set(ids[i], tasks[i])
  }

  const reminders = tasks
    .filter(/** @type {TIsRequirePropPresent<RequireProp<ITaskInput, 'brand' | 'created_by'>, 'reminders'>} */(t => Array.isArray(t.reminders)))
    .filter(t => t.reminders.length > 0)
    .map(t => ({
      task: t.id,
      is_relative: t.reminders[0].is_relative,
      timestamp: t.reminders[0].timestamp,
      needs_notification: t.status !== 'DONE'
    }))

  await Reminder.createMany(reminders)

  const assignees = tasks
    .filter(/** @type {TIsRequirePropPresent<RequireProp<ITaskInput, 'brand' | 'created_by'>, 'assignees'>} */(t => Array.isArray(t.assignees)))
    .flatMap(t => t.assignees.map(/** @returns {ITaskAssigneeInput} */user => ({
      crm_task: /** @type {RequireProp<ITaskInput, 'id'>} */(t).id,
      user,
      created_by: t.created_by
    })))

  await Assignee.create(assignees)

  const associations = tasks
    .filter(/** @type {TIsRequirePropPresent<RequireProp<ITaskInput, 'brand' | 'created_by'>, 'associations'>} */(t => Array.isArray(t.associations)))
    .flatMap(t => t.associations.map(/** @returns {ICrmAssociationInput} */a => ({
      ...a,
      task: t.id,
      created_by: t.created_by,
      brand: t.brand
    })))

  await CrmAssociation.createMany(associations)

  emitter.emit('create', {
    user_id: tasks[0].created_by,
    brand_id: tasks[0].brand,
    task_ids: ids,
    reason: _reason
  })

  return ids
}

/**
 * Deletes a task by id. Also deletes any reminders associated with it.
 * @param {UUID[]} task_ids Task ID to remove
 * @param {string} _reason
 * @returns {Promise<any>}
 */
const remove = async (task_ids, user_id, _reason = 'direct_request') => {
  const tasks = await getAll(task_ids)
  const by_brand = _.groupBy(tasks, 'brand')

  const res = await db.query.promise('crm/task/delete', [
    task_ids,
    user_id
  ])

  const reminders_to_remove = tasks.filter(t => Array.isArray(t.reminders)).flatMap(t => t.reminders)
  await Reminder.removeMany(reminders_to_remove)

  for (const brand_id of Object.keys(by_brand)) {
    emitter.emit('delete', {
      user_id,
      brand_id,
      task_ids,
      reason: _reason
    })
  }

  return res
}

/**
 * @param {RequireProp<Partial<ITaskInput>, 'id'>[]} tasks 
 * @param {UUID} user_id 
 * @param {string=} _reason
 */
const updateMany = async (tasks, user_id, _reason = 'direct_request') => {
  for (const task of tasks) {
    await validate(task)
  }

  const current_tasks = _.keyBy(
    await getAll(tasks.map(({id}) => id)),
    'id'
  )

  /** @type {Map<UUID, Record<TBaseTaskInputKeys, UUID[]>>} */
  const changeset = new Map

  const fields = [
    'id',
    'created_by',
    'brand',
    'title',
    'description',
    'due_date',
    'end_date',
    'status',
    'task_type',
    'metadata',
    'all_day'
  ]

  const refined_tasks = tasks.map(t => ({
    ...belt.ensureFields({...t}, fields, {}, {
      due_date: d => belt.epochToDate(d).toISOString(),
      end_date: d => d ? belt.epochToDate(d).toISOString() : null,
    }),
    all_day: t.all_day || false
  }))

  for (const task of refined_tasks) {
    const existing = current_tasks[task.id]
    const brand_changeset = changeset.get(existing.brand) || {
      title: [],
      task_type: [],
      description: [],
      due_date: [],
      end_date: [],
      status: [],
      metadata: []
    }

    changeset.set(existing.brand, brand_changeset)

    for (const key of /** @type {TBaseTaskInputKeys[]} */(Object.keys(changeset))) {
      if (fieldChanged(existing, task, key)) {
        brand_changeset[key].push(task.id)
      }
    }
  }

  const for_update = refined_tasks.map(t => _.pick(t, ['id', 'title', 'task_type', 'description', 'due_date', 'end_date', 'status', 'metadata', 'all_day']))
  await db.update('crm/task/update_many', [user_id, JSON.stringify(for_update)])

  await updateAssignees(current_tasks, tasks, user_id)
  await updateAssociations(current_tasks, tasks, user_id)
  await updateReminders(current_tasks, tasks, user_id)

  for (const [brand_id, brand_changeset] of changeset.entries()) {
    if (brand_changeset) {
      for (const key in brand_changeset) {
        emitter.emit(`update:${key}`, {
          task_ids: changeset[key],
          brand_id,
          user_id,
          reason: _reason
        })
      }
    }
  }

  const per_brand = _.groupBy(refined_tasks, 'brand')

  for (const brand_id of Object.keys(per_brand)) {
    emitter.emit('update', {
      task_ids: per_brand[brand_id].map(t => t.id),
      brand_id,
      user_id,
      reason: _reason
    })
  }
}

/**
 * Updates a task
 * @param {UUID} task_id Id of the task to be updated
 * @param {RequireProp<Partial<ITaskInput>, 'due_date'>} task Task object to replace the old data
 * @param {UUID} user_id
 * @param {string} _reason
 * @returns {Promise<ITask>}
 */
const update = async (task_id, task, user_id, _reason = 'direct_request') => {
  await validate(task)

  const current = await get(task_id)

  const due_date = belt.epochToDate(task.due_date)
  const end_date = task.end_date ? belt.epochToDate(task.end_date) : null

  const date_changed = fieldChanged(current, task, 'due_date')
  const meta_changed = fieldChanged(current, task, 'metadata')
  const status_changed = fieldChanged(current, task, 'status')
  const task_changed = objectChanged(current, task, [
    'title',
    'description',
    'due_date',
    'end_date',
    'status'
  ])

  if (task_changed || meta_changed) {
    await db.update('crm/task/update', [
      task_id,
      task.title,
      task.description,
      due_date,
      end_date,
      task.status,
      task.task_type,
      task.metadata,
      task.all_day || false,
      user_id
    ])

    if (status_changed) {
      emitter.emit('update:status', {
        task_ids: [task_id],
        brand_id: current.brand,
        user_id,
        reason: _reason
      })
    }

    if (date_changed) {
      emitter.emit('update:due_date', {
        task_ids: [task_id],
        brand_id: current.brand,
        user_id,
        reason: _reason
      })
    }

    emitter.emit('update', { task_ids: [task_id], brand_id: current.brand, user_id, reason: _reason })
  }

  const updatedTask = task_changed ? (await get(task_id)) : current

  let associations_changed = false

  if (Array.isArray(task.associations)) {
    associations_changed = await updateAssociations({ [updatedTask.id]: updatedTask }, [{ ...task, id: task_id }], user_id)
  }

  if (Array.isArray(task.reminders)) {
    await updateReminders({ [updatedTask.id]: updatedTask }, [{ ...task, id: task_id }], user_id)
  }

  if (Array.isArray(task.assignees)) {
    await updateAssignees({ [updatedTask.id]: updatedTask }, [{ ...task, id: task_id }], user_id)
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

  return get(task_id)
}

/**
 * Differentiates old and new reminders in task data objects
 * @param {Record<UUID, ITask>} current_tasks
 * @param {RequireProp<Partial<ITaskInput>, 'id'>[]} tasks
 * @param {UUID} user_id
 */
const updateReminders = async (current_tasks, tasks, user_id) => {
  /** @type {RequireProp<IReminderInput, 'needs_notification'>[]} */
  const toAdd = []

  /** @type {RequireProp<IReminderInput, 'id' | 'needs_notification'>[]} */
  const toUpdate = []

  /** @type {UUID[]} */
  let toRemove = []

  for (const task of tasks) {
    const existing = current_tasks[task.id].reminders || []
    /** @type {Omit<IReminderInput, 'needs_notification'>[]} */
    const new_reminders = task.reminders || []
    const new_ids = new_reminders.map(r => r.id)

    for (const r of new_reminders) {
      if (r.id && existing.includes(r.id)) {
        toUpdate.push({ ...r, id: r.id, needs_notification: task.status !== 'DONE' })
      } else {
        toAdd.push({
          ...r,
          task: task.id,
          needs_notification: task.status !== 'DONE'
        })
      }
    }

    toRemove = toRemove.concat(_.difference(existing, new_ids))
  }

  await Reminder.removeMany(toRemove)
  await Reminder.updateMany(toUpdate)
  await Reminder.createMany(toAdd)
}

/**
 * Differentiates old and new associations in tasks
 * @param {Record<UUID, ITask>} current_tasks The existing task objects
 * @param {RequireProp<Partial<ITaskInput>, 'id'>[]} tasks Array of new task data
 * @param {UUID} user_id Current user
 */
const updateAssociations = async (current_tasks, tasks, user_id) => {
  /** @type {ICrmAssociationInput[]} */
  let toAdd = []

  /** @type {RequireProp<ICrmTaskAssociationInputWithId, 'id'>[]} */
  let toUpdate = []

  /** @type {UUID[]} */
  let toRemove = []

  for (const task of tasks) {
    /** @type {ICrmTaskAssociationInputWithId[] | undefined} */
    const associations = task.associations
    const existing = current_tasks[task.id]

    if (!Array.isArray(associations)) continue

    toAdd = toAdd.concat(
      associations.filter(a => !a.id).map(a => ({
        ...a,
        task: task.id,
        created_by: user_id,
        brand: existing.brand
      }))
    )

    if (!existing.associations) continue

    /** @type {TIsRequirePropPresent<ICrmTaskAssociationInputWithId, 'id'>} */
    const to_update_filter = a => (typeof a.id === 'string') && (/** @type {string[]} */(existing.associations).includes(a.id))
    const associations_to_update = associations.filter(to_update_filter)
    const ids_to_keep = associations_to_update.map(a => a.id).filter(x => x)

    toUpdate = toUpdate.concat(associations_to_update)

    toRemove = toRemove.concat(
      existing.associations.filter(id => !ids_to_keep.includes(id))
    )
  }

  await CrmAssociation.remove(toRemove, null, user_id)
  await CrmAssociation.update(toUpdate)
  await CrmAssociation.createMany(toAdd)

  return toAdd.length > 0 || toRemove.length > 0
}

/**
 * Differentiates old and new assignees in task objects
 * @param {Record<UUID, ITask>} current_tasks The existing task data object
 * @param {RequireProp<Partial<ITaskInput>, 'id'>[]} tasks The new task data
 * @param {UUID} user_id
 */
const updateAssignees = async (current_tasks, tasks, user_id) => {
  /** @type {ITaskAssigneeInput[]} */
  let toAdd = []

  /** @type {UUID[]} */
  let toRemove = []

  for (const task of tasks) {
    const assignees = task.assignees
    const existing = current_tasks[task.id]

    if (!Array.isArray(assignees)) continue

    toAdd = toAdd.concat(
      _.difference(assignees, existing.assignees).map(user => ({
        crm_task: task.id,
        user,
        created_by: user_id
      }))
    )
    toRemove = toRemove.concat(
      _.difference(existing.assignees, assignees)
    )
  }

  await Assignee.create(toAdd)
  await Assignee.delete(toRemove, user_id)
}


module.exports = {
  validate,
  hasAccess,
  clone,
  create,
  createMany,
  remove,
  updateMany,
  update,
  updateReminders,
  updateAssociations,
  updateAssignees
}
