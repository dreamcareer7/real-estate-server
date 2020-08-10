const db = require('../../../utils/db')


/**
 * @param {UUID[]} ids 
 * @returns {Promise<IBrandList[]>}
 */
const getAll = async (ids) =>{
  return db.select('brand/list/get', [ids])
}

/**
 * Get list templates by brand
 * @param {UUID} brand 
 * @returns {Promise<IBrandList[]>}
 */
const getForBrand = async (brand) =>{
  const ids = await db.selectIds('brand/list/for_brand', [brand])
  return getAll(ids)
}


module.exports = {
  getAll,
  getForBrand
}