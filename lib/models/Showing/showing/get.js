const db = require('../../../utils/db')
const Orm = require('../../Orm/context')

/**
 * @param {UUID[]} ids
 * @returns {Promise<import('./types').Showing[]>}
 */
async function getAll(ids) {
  return db.select('showing/showing/get', [ids, Orm.getEnabledAssociations()])
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
