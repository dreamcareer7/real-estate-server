const db = require('../../utils/db')


/**
 * @param {UUID[]} ids 
 * @returns {Promise<import('./types').IStoredFlow[]>}
 */
const getAll = async (ids) => {
  return db.select('flow/get', [ids])
}

/**
 * @param {UUID} id 
 */
const get = async (id) => {
  const flows = await getAll([id])

  if (flows.length < 1) {
    throw Error.ResourceNotFound(`Flow ${id} not found!`)
  }

  return flows[0]
}


module.exports =  {
  getAll,
  get
}
