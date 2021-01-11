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
