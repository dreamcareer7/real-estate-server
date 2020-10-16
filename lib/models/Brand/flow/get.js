const db = require('../../../utils/db')
const Context = require('../../Context')


function getCurrentBrand() {
  const brand = Context.get('brand')

  if (brand) return brand.id
}

/**
 * @param {UUID[]} ids 
 * @returns {Promise<IBrandFlow[]>}
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


module.exports = {
  get,
  getAll,
  getCurrentBrand
}
