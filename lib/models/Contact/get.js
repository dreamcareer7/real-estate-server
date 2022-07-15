const db = require('../../utils/db')
const Orm = require('../Orm/context')
const Context = require('../Context')

const { fastFilter } = require('./fast_filter')

async function get(id) {
  const result = await getAll([id])

  if (!Array.isArray(result) || result.length < 1)
    throw Error.ResourceNotFound(`Contact ${id} not found`)

  return result[0]
}

/**
 * Get contacts by id
 * @param {UUID[]} ids 
 * @param {UUID=} user_id 
 * @returns {Promise<IContact[]>}
 */
async function getAll(ids, user_id = undefined) {
  const current_user = Context.get('user')
  user_id = user_id || (current_user ? current_user.id : null)

  return db.select('contact/get', [
    ids,
    user_id,
    Orm.getEnabledAssociations()
  ])
}

/**
 * 
 * @param {UUID} brand_id
 * @param {UUID | undefined | null} user_id
 * @param {IContactAttributeFilter[]} attribute_filters 
 * @param {(IContactFilterOptions & PaginationOptions)=} options 
 */
async function getForBrand(brand_id, user_id, attribute_filters, options) {
  const filter_res = await fastFilter(brand_id, user_id, attribute_filters, options)
  const rows = await getAll(Array.from(filter_res.ids))

  if (rows.length === 0) return []

  // @ts-ignore
  rows[0].total = filter_res.total
  return rows
}

module.exports = {
  get,
  getAll,
  getForBrand,
}
