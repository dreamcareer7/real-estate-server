const isString = require('lodash/isString')

const sq = require('../../../../utils/squel_extensions')
const db = require('../../../../utils/db.js')
// const validator = require('../../utils/validator.js')

/**
 * Get Total and Lead IDS
 * @param {UUID} brand - brand id
 * @typedef {import('./types').Filter} Filter
 * @typedef {import('./types').FilterResult} FilterResult
 * @param {Filter} options  
 * @returns {Promise<FilterResult>}
 */

const filter = async (brand, options) => {
  const q = sq
    .select()
    .field('lc.id')
    .field('COUNT(*) OVER()::INT', 'total')
    .from('lead_channels', 'lc')
    .where('lc.deleted_at IS NULL')
    .where('brand = ?', brand)

  if (isString(options.user)) {
    q.where('user = ?', options.user)
  }

  if (options.source_type) {
    q.where('source_type = ?', options.source_type)
  }

  if (options.start && Number.isSafeInteger(Number(options.start))) {
    q.offset(options.start)
  }

  if (options.limit && Number.isSafeInteger(Number(options.limit))) {
    q.limit(options.limit)
  }

  const rows = await db.select(q)
  
  // @ts-ignore
  q.name = 'lead_channel/filter'
  if (rows.length === 0)
    return {
      ids: [],
      total: 0,
    }

  return {
    ids: rows.map((r) => r.id),
    total: rows[0].total,
  }
}

module.exports = {
  filter,
}
