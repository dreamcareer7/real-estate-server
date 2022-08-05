const isString = require('lodash/isString')

const sq = require('../../utils/squel_extensions')
const db = require('../../utils/db.js')
// const validator = require('../../utils/validator.js')

/**
 * Get Total and social post IDS
 * @param {UUID} brand - brand id
 * @typedef {import('./types').Filter} Filter
 * @typedef {import('./types').FilterResult} FilterResult
 * @param {Filter} options  
 * @returns {Promise<FilterResult>}
 */

const filter = async (brand, options) => {
  const q = sq
    .select()
    .field('sp.id')
    .field('COUNT(*) OVER()::INT', 'total')
    .from('social_posts', 'sp')
    .where('sp.deleted_at IS NULL')
    .where('brand = ?', brand)

  if (isString(options.user)) {
    q.where('created_by = ?', options.user)
  }

  if (options.executed === 'true') {
    q.where('executed_at IS NOT NULL')
  }

  if (options.executed  === 'false') { 
    q.where('executed_at IS NULL')
  }
  
  if (options.start && Number.isSafeInteger(Number(options.start))) {
   
    q.offset(options.start)
  }

  if (options.limit && Number.isSafeInteger(Number(options.limit))) {
    q.limit(options.limit)
  }

  const rows = await db.select(q)
  
  // @ts-ignore
  q.name = 'social_post/filter'
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
