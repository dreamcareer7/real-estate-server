const sq = require('../../../utils/squel_extensions')
const db = require('../../../utils/db')

/**
 * @param {UUID} brand
 * @param {import("./types").AppointmentFilterOptions} query 
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

  if (query.status) {
    q.where('status = ?', query.status)
  }

  q.name = 'showing/appointment/filter'

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
