const db = require('../../utils/db')
const sq = require('../../utils/squel_extensions')
const isString = require('lodash/isString')
const isNull = require('lodash/isNull')

/**
 * @param {*} params 
 * @returns {Promise<UUID[]>}
 */
async function filter(params) {
  const q = sq.select()
    .field('id')
    .from('triggers')

  if (params.brand)
    q.where('brand = ?', params.brand)

  if (Array.isArray(params.contacts)) {
    q.where('contact = ANY(?::uuid[])', sq.SqArray.from(params.contacts))
  }

  if (Array.isArray(params.flows)) {
    q.where('flow = ANY(?::uuid[])', sq.SqArray.from(params.flows))
  }

  if (Array.isArray(params.scheduled_after)) {
    q.where('scheduled_after = ANY(?::uuid[])', sq.SqArray.from(params.scheduled_after))
  }

  if (isString(params.flow) || isNull(params.flow)) {
    q.where('flow IS NOT DISTINCT FROM ?::uuid', params.flow)
  }

  if (isString(params.flow_step) || isNull(params.flow_step)) {
    q.where('flow_step IS NOT DISTINCT FROM ?::uuid', params.flow_step)
  }

  if (params.executed_at || isNull(params.executed_at)) {
    q.where('executed_at IS NOT DISTINCT FROM ?::timestamp', params.executed_at)
  }

  if (Array.isArray(params.event_type)) {
    q.where('event_type = ANY(?::uuid[])', sq.SqArray.from(params.event_type))
  }

  if (Array.isArray(params.action)) {
    q.where('action = ANY(?::uuid[])', sq.SqArray.from(params.action))
  }

  if (isString(params.origin_ne) || isNull(params.origin_ne)) {
    q.where('origin IS DISTINCT FROM ?::uuid', params.origin_ne)
  }

  if (isString(params.origin) || isNull(params.origin)) {
    q.where('origin IS NOT DISTINCT FROM ?::uuid', params.origin)
  }

  const BEFORE_DUE = '3days'
  if (params.effectively_executed === true) {
    q.where('executed_at <= now() - ?::interval', BEFORE_DUE)
  } else if (params.effectively_executed === false) {
    q.where('COALESCE(executed_at > now() - ?::interval, TRUE)', BEFORE_DUE)
  }

  if (params.order) {
    const desc = params.order[0] === '-'
    const field = ('+-'.indexOf(params.order[0]) > -1) ? params.order.substring(1) : params.order

    q.order(field, !desc)
  }

  q.name = 'trigger/filter'

  return db.selectIds(q)
}

module.exports = {
  filter,
}
