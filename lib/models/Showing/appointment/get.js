const db = require('../../../utils/db')
const Context = require('../../Context')
const Orm = require('../../Orm/context')

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
 * @param {{ threshold: string = '5min' }} options
 * @returns {Promise<{ id: UUID, status: string }[]>}
 */
async function getAllRecentlyDone ({ threshold = '5min' } = {}) {
  return db.select('showing/appointment/recently_done', [threshold])
}

module.exports = {
  get,
  getAll,
  getAllPublic,
  getAllRecentlyDone,
}
