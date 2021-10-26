const pick = require('lodash/pick')
const has = require('lodash/has')

const SuperCampaign = require('./get')
const sq = require('../../../utils/squel_extensions')
const db = require('../../../utils/db')

/** 
 * @typedef {import('./types').Filter} SuperCampaignFilter 
 * @typedef {import('./types').SuperCampaignStored} SuperCampaignStored
 */

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
  const { start, limit } = opts

  // TODO: Implement missing options
  
  if (has(opts, 'order')) {
    throw Error.NotImplemented('option `order` is not implemented yet')
  }

  if (has(opts, 'status')) {
    throw Error.NotImplemented('options `status` is not implemented yet')
  }

  if (has(opts, 'start') && (
    !Number.isSafeInteger(start) || (start ?? -1) < 0
  )) {
    throw Error.Validation('`start` must be a non-negative safe integer')
  }
  
  if (has(opts, 'limit') && (
    !Number.isSafeInteger(limit) || (limit ?? 0) < 1 || (limit ?? Infinity) > 50
  )) {
    throw Error.Validation('`limit` must be an integer in range [1, 50]')
  }

  return pick(opts, 'start', 'limit')
}

module.exports = {
  filter,
  sanitizeFilterOptions,
}
