const sq = require('../../../utils/squel_extensions')
const db = require('../../../utils/db')

/**
 * @param {UUID} brand
 * @param {import("./types").ShowingFilterOptions} query 
 */
async function filter(brand, query) {
  const q = sq
    .select({
      rawNesting: true
    })
    .field('id')
    .field('COUNT(*) OVER()::INT', 'total')
    .from('showings')
    .where('brand = ?', brand)

  if (query.deal) {
    q.where('deal = ?', query.deal)
  }
  if (query.listing) {
    q.where('listing = ?', query.listing)
  }
  if (typeof query.live === 'boolean') {
    if (query.live) {
      q.where('aired_at IS NOT NULL')
    } else {
      q.where('aired_at IS NULL')
    }
  }

  q.name = 'showing/showing/filter'

  const rows = await db.select(q)

  if (rows.length === 0) {
    return {
      ids: [],
      total: 0
    }
  }

  return {
    ids: rows.map(r => r.id),
    total: rows.length
  }
}

module.exports = {
  filter,
}
