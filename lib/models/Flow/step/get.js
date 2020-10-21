const db = require('../../../utils/db')


/**
 * @param {UUID[]} ids 
 * @returns {Promise<import('./types').IStoredFlowStep[]>}
 */
const getAll = async (ids) => {
  return db.select('flow/step/get', [ids])
}

/**
 * @param {UUID} id 
 */
const get = async (id) => {
  const steps = await getAll([id])

  if (steps.length < 1) {
    throw Error.ResourceNotFound(`FlowStep ${id} not found!`)
  }

  return steps[0]
}


module.exports = {
  getAll,
  get
}
