const db = require('../../../utils/db')

/**
 * @param {UUID[]} ids
 * @returns {Promise<import('./types').ShowingAppointment[]>}
 */
async function getAll(ids) {
  return db.select('showing/appointment/get', [ids])
}

/**
 * @param {UUID[]} ids
 * @returns {Promise<import('./types').ShowingAppointment[]>}
 */
async function getAllPublic(ids) {
  return db.select('showing/appointment/get_public', [ids])
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
  getAllPublic,
}
