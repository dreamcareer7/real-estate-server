const db = require('../../../utils/db.js')
const Orm = require('../../Orm/context')
const CrmAssociation = require('../Association')

const { filter } = require('./filter')


/**
 * Get a task by id
 * @param {UUID} id Task id to fetch
 */
const get = async (id) => {
  const tasks = await getAll([id])

  if (!tasks || tasks.length < 1) {
    throw Error.ResourceNotFound(`Task ${id} not found`)
  }

  return tasks[0]
}

/**
 * Get multiple tasks by id
 * @param {UUID[]} ids Array of task ids to fetch
 * @param {boolean} skip_associations Skip fetching associations
 * @returns {Promise<ITask[]>}
 */
const getAll = async (ids, skip_associations = false) => {
  const associations = Orm.getEnabledAssociations()
  const conditions = Orm.getAssociationConditions('crm_task.associations')

  /** @type {ITask[]} */
  const tasks = await db.select('crm/task/get', [
    ids,
    associations,
    conditions ? conditions.limit : null
  ])

  if (!skip_associations) {
    const association_ids = tasks.flatMap(t => t.associations || [])
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
const getForUser = async (user_id, brand_id, options) => {
  const result = await filter(user_id, brand_id, options)
  const tasks = await getAll(result.ids)

  if (tasks.length === 0)
    return []

  // @ts-ignore
  tasks[0].total = result.total
  return tasks
}


module.exports = {
  get,
  getAll,
  getForUser
}