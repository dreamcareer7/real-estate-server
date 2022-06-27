const _ = require('lodash')
const sq = require('../../../utils/squel_extensions')
const db = require('../../../utils/db.js')
const validator = require('../../../utils/validator.js')
const { getAllOptionsSchema } = require('./schemas.js')
const CrmAssociation = require('../Association')

const validateOptions = validator.promise.bind(null, getAllOptionsSchema)


/**
 * Paginate, sort and filter tasks by various options.
 * @param {UUID} user_id User id requesting tasks
 * @param {ITaskFilters & PaginationOptions} options filter and pagination options
 * @returns {Promise<IIdCollectionResponse>}
 */
const filter = async (user_id, brand_id, options) => {
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

  if (options.type === 'Event') {
    q.where('task_type = \'Other\'')
  } else if (options.type === 'Task' && !_.isNil(options.task_type) && options.task_type !== 'Other') {
    q.where('task_type = ?', options.task_type)
  } else if (options.type === 'Task' && !_.isNil(options.task_type)) {
    q.where('task_type != \'Other\'')
  } else if (_.isNil(options.type) && options.task_type) {
    q.where('task_type = ?', options.task_type)
  }

  if (Array.isArray(options.q)) {
    const q_expr = sq.expr()
    for (const term of options.q) {
      q_expr.and('searchable_field ILIKE ?', '%' + term + '%')
    }
    q.where(q_expr)
  }

  if (options.title) {
    q.where('title = ?', options.title)
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

  q.name = 'crm/task/filter'
  const rows = await db.select(q)

  if (rows.length === 0)
    return {
      ids: [],
      total: 0
    }

  return {
    ids: rows.map(r => r.id),
    total: rows[0].total
  }
}


module.exports = {
  filter
}
