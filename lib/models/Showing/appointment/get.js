const db = require('../../../utils/db')
const Context = require('../../Context')
const Orm = require('../../Orm/context')
const map = require('lodash/map')

/**
 * @param {UUID[]} ids
 * @returns {Promise<import('./types').ShowingAppointment[]>}
 */
async function getAll(ids) {
  const user = Context.get('user')
  return db.select('showing/appointment/get', [ids, user?.id, Orm.getEnabledAssociations()])
}

/**
 * @param {UUID[]} ids
 * @returns {Promise<import('./types').ShowingAppointmentPublic[]>}
 */
async function getAllPublic(ids) {
  return db.select('showing/appointment/get_public', [ids])
}

/**
 * @param {UUID} id
 */
async function get(id) {
  const [result] = await getAll([id])
  return result
}

/**
 * @param {{ threshold: string }} options
 * @returns {Promise<UUID[]>}
 */
async function getAllRecentlyDone ({ threshold = '1h' } = {}) {
  const results = await db.select('showing/appointment/recently_done', [
    threshold
  ])

  return map(results, 'id')
}

module.exports = {
  get,
  getAll,
  getAllPublic,
  getAllRecentlyDone,
}
