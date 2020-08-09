const db = require('../../../utils/db.js')

/**
 * Get contact lists by id
 * @param {UUID[]} ids 
 * @returns {Promise<IContactList[]>}
 */
async function getAll(ids) {
  return db.select('contact/list/get', [ids])
}

/**
 * Get list by id
 * @param {UUID} id 
 */
async function get(id) {
  const res = await getAll([id])
  if (res.length < 1)
    throw Error.ResourceNotFound('ContactList not found.')

  return res[0]
}

/**
 * Get list ids accessible by at least one of the brands
 * @param {UUID[]} brands Brands
 * @param {UUID[]=} users Owners
 * @returns {Promise<UUID[]>}
 */
function getForBrands(brands, users) {
  return db.selectIds('contact/list/list_for_brands', [brands, users])
}

/**
 * Get contact lists by owner brand
 * @param {UUID} brand Brand of the lists
 * @param {UUID[]=} users Owners of the lists
 * @returns {Promise<IContactList[]>}
 */
async function getForBrand(brand, users) {
  const ids = await getForBrands([brand], users)
  return getAll(ids)
}

module.exports = {
  get,
  getAll,
  getForBrand,
  getForBrands,
}
