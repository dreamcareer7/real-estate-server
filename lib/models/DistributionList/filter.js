const sq = require('../../utils/squel_extensions')
const db = require('../../utils/db.js')

/**
 * Get Total and distribution_lists IDS
 * @param {string} postal_code - postal_code
 * @typedef {import('./types').Filter} Filter
 * @typedef {import('./types').FilterResult} FilterResult
 * @returns {Promise<FilterResult>}
 */

const filter = async (postal_code) => {
  if (!postal_code) {
    throw new Error('postal_code should provide')
  }

  const q = sq
    .select()
    .field('dl.id')
    .field('COUNT(*) OVER()::INT', 'total')
    .from('distribution_lists_contacts', 'dl')
    .where('dl.deleted_at IS NULL')
    .where('dl.postal_code = ?', postal_code)

  const rows = await db.select(q)
  // @ts-ignore
  q.name = 'distribution_lists_contacts/filter'
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
