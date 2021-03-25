const db = require('../../../utils/db')

/**
 * @param {UUID[]} ids
 * @returns {Promise<import('./types').ShowingRole[]>}
 */
async function getAll(ids) {
  return db.select('showing/role/get', [ids])
}

/**
 * @param {UUID} id 
 */
async function get(id) {
  const [ result ] = await getAll([id])
  return result
}

/**
 * Finds all roles of a user in a showing
 * @param {UUID} showing_id 
 * @param {UUID} user_id 
 * @returns {Promise<import('./types').ShowingRole[]>}
 */
async function getByUser(showing_id, user_id) {
  const ids = await db.selectIds('showing/role/find_by_user', [ showing_id, user_id ])
  return getAll(ids)
}

module.exports = {
  get,
  getAll,
  getByUser
}
