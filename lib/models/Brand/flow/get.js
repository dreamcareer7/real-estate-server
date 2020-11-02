const db = require('../../../utils/db')
const Context = require('../../Context')


function getCurrentBrand() {
  const brand = Context.get('brand')

  if (brand) return brand.id
}

/**
 * @param {UUID[]} ids 
 * @returns {Promise<import('./types').IBrandFlow[]>}
 */
const getAll = async (ids) =>{
  return db.select('brand/flow/get', [ids, getCurrentBrand()])
}

/**
 * @param {UUID} id 
 */
const get = async (id) =>{
  const res = await getAll([id])

  if (res.length < 1) {
    throw Error.ResourceNotFound(`BrandFlow ${id} does not exist.`)
  }

  return res[0]
}

/**
 * @param {UUID} brand_id 
 */
const forBrand = async (brand_id) =>{
  const ids = await db.selectIds('brand/flow/for_brand', [brand_id])

  return getAll(ids)
}

module.exports = {
  get,
  getAll,
  forBrand,
}
