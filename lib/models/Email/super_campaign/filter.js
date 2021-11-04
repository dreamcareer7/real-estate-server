const isString = require('lodash/isString')
const pick = require('lodash/pick')
const has = require('lodash/has')

const SuperCampaign = require('./get')
const sq = require('../../../utils/squel_extensions')
const db = require('../../../utils/db')

/** 
 * @typedef {import('./types').Filter} SuperCampaignFilter 
 * @typedef {import('./types').SuperCampaignStored} SuperCampaignStored
 */

const MAX_LIMIT = 1000

/**
 * @typedef {SuperCampaignStored & { total: number }} SuperCampaignWithTotal 
 * @param {SuperCampaignFilter=} [opts={}]
 * @returns {Promise<[] | [SuperCampaignWithTotal, ...SuperCampaignStored[]]>}
 */
async function filter (opts = {}) {
  const q = sq
    .select()
    .field('id')
    .field('COUNT(*) OVER()::INT', 'total')
    .from('super_campaigns')
    .where('deleted_at IS NULL')

  if (Array.isArray(opts.brand_in)) {
    if (!opts.brand_in.length) { return [] }
    q.where('brand = ANY(?::uuid[])', sq.SqArray.from(opts.brand_in))
  }

  if (opts.executed === true) {
    q.where('executed_at IS NOT NULL')
  }

  if (opts.executed === false) {
    q.where('executed_at IS NULL')
  }

  if (Array.isArray(opts.order) && opts.order.length) {
    // @ts-ignore
    q.signedOrder({
      on: ['created_at', 'updated_at', 'executed_at', 'subject', 'description'],
      by: opts.order,
    })
  }
  
  if (Number.isSafeInteger(opts.start)) {
    q.offset(opts.start ?? NaN)
  }

  if (Number.isSafeInteger(opts.limit)) {
    q.limit(opts.limit ?? NaN)
  }

  Object.assign(q, { name: 'email/super_campaign/filter' })
  const rows = await db.select(q)
  if (!rows.length) { return [] }

  const ids = rows.map(r => r.id)
  const total = rows[0].total
  const superCampaigns = await SuperCampaign.getAll(ids)
  Object.assign(superCampaigns[0], { total })

  return /** @type {[]} */(superCampaigns)
}

/**
 * @param {SuperCampaignFilter} opts
 * @returns {SuperCampaignFilter}
 */
function sanitizeFilterOptions (opts) {
  const { start, limit, order } = opts

  if (has(opts, 'order') && (!Array.isArray(order) || !order?.every(isString))) {
    throw Error.Validation('`order` must be an array of strings')
  }

  if (has(opts, 'start') && (
    !Number.isSafeInteger(start) || (start ?? -1) < 0
  )) {
    throw Error.Validation('`start` must be a non-negative safe integer')
  }
  
  if (has(opts, 'limit') && (
    !Number.isSafeInteger(limit) || (limit ?? 0) < 1 || (limit ?? Infinity) > MAX_LIMIT
  )) {
    throw Error.Validation(`\`limit\` must be an integer in range [1, ${MAX_LIMIT}]`)
  } else {
    opts = { ...opts, limit: MAX_LIMIT }
  }

  return pick(opts, 'start', 'limit')
}

module.exports = {
  filter,
  sanitizeFilterOptions,
}
