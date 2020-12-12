const db = require('../../utils/db')
const sq = require('../../utils/squel_extensions')

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

  q.name = 'trigger/filter'

  return db.selectIds(q)
}

module.exports = {
  filter,
}
