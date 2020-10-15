const db = require('../../../utils/db')


/**
 * @param {UUID} brand
 * @returns {Promise<IBrandEvent[]>}
 */
const getByBrand = async (brand) => {
  const ids = await db.select('brand/event/by_brand', [brand])
  return getAll(ids)
}

/**
 * @param {UUID[]} ids 
 * @returns {Promise<IBrandEvent[]>}
 */
const getAll = async (ids) => {
  return db.select('brand/event/get', [ids])
}

/**
 * @param {UUID} id 
 */
const get = async id => {
  const res = await getAll([id])

  if (!res || res.length < 1) {
    throw Error.ResourceNotFound(`BrandEvent ${id} not found.`)
  }

  return res[0]
}


module.exports = {
  getByBrand,
  getAll,
  get,
}
