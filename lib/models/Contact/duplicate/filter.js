const sq = require('../../../utils/squel_extensions')
const db = require('../../../utils/db')

const {
  get,
  getAll,
} = require('./get')

/**
 * Finds merge suggestions for a brand
 * @param {UUID} brand
 * @param {{ contact?: UUID; } & PaginationOptions} query
 */
async function filter(brand, query = {}) {
  function getQ() {
    const _q = sq.select()
      .from('contacts_duplicate_clusters')
      .join('contacts', undefined, 'contact = contacts.id')
      .where('check_contact_read_access(contacts.*, ?, NULL)', brand)
      .where('deleted_at IS NULL')

    if (query.contact)
      _q.where('contact = ?', query.contact)

    return _q
  }

  const countQ = getQ()
    .field('count(distinct cluster)', 'total')

  const q = getQ()
    .distinct('cluster')
    .field('cluster::INT', 'id')
    .order('cluster')

  // q.order('contacts.updated_at', false)

  if (query.start) q.offset(query.start)
  if (query.limit) q.limit(query.limit)

  q.name = 'contact/duplicate/filter'

  const rows = await db.select(q)

  if (rows.length === 0) {
    return {
      ids: [],
      total: 0
    }
  }

  const r = await db.selectOne(countQ)

  return {
    ids: rows.map(r => r.id),
    total: r.total
  }
}

async function findForBrand(brand_id, query = {}) {
  const { ids, total } = await filter(brand_id, query)

  const rows = await getAll(ids)

  if (rows.length === 0) return []

  // @ts-ignore
  rows[0].total = total
  return rows
}

/**
 * Finds merge suggestions for a contact
 * @param {UUID} brand_id 
 * @param {UUID} contact_id
 * @returns {Promise<IContactDuplicateCluster>}
 */
async function findForContact(brand_id, contact_id) {
  const { ids } = await filter(brand_id, { contact: contact_id, limit: 1 })

  if (ids.length < 1) throw Error.ResourceNotFound(`Cluster not found for contact ${contact_id}.`)

  return get(ids[0])
}

module.exports = {
  filter,
  findForBrand,
  findForContact,
}
