const db = require('../../../utils/db')


/**
 * @param {UUID[]} ids 
 * @returns {Promise<import('./types').IStoredBrandFlowStep[]>}
 */
const getAll = async (ids) => {
  return db.select('brand/flow/step/get', [ids])
}

/**
 * @param {UUID} id 
 */
const get = async (id) => {
  const res = await getAll([id])

  if (res.length < 1) {
    throw Error.ResourceNotFound(`BrandFlowStep ${id} does not exist.`)
  }

  return res[0]
}


module.exports = {
  getAll,
  get
}
