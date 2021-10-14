const db = require('../../../utils/db')

/**
 * @param {UUID[]} ids
 * @returns {Promise<import('./types').ShowingApproval[]>}
 */
async function getAll(ids) {
  if (!ids?.length) { return [] }
  
  return db.select('showing/approvals/get', [ids])
}

/**
 * @param {UUID} id 
 */
async function get(id) {
  const [ result ] = await getAll([id])
  return result
}

module.exports = {
  get,
  getAll,
}
