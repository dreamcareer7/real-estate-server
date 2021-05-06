const db = require('../../../utils/db')
const slug = require('slug')

const Orm = require('../../Orm/context')

/**
 * @param {UUID[]} ids
 * @returns {Promise<import('./types').Showing[]>}
 */
async function getAll(ids) {
  /** @type {(import('./types').Showing)[]} */
  const showings = await db.select('showing/showing/get', [ids, Orm.getEnabledAssociations()])
  for (const showing of showings) {
    if (showing.title) {
      showing.slug = slug(showing.title)
    }
  }

  return showings
}

/**
 * @param {number} id
 * @returns {Promise<UUID>}
 */
async function getByHumanReadableId(id) {
  return db.selectId('showing/showing/get_by_human_readable_id', [id])
}

/**
 * @param {number[]} ids
 * @returns {Promise<import('./types').ShowingPublic[]>}
 */
async function getAllForBuyer(ids) {
  /** @type {(import('./types').ShowingPublic & { deal: UUID | null; })[]} */
  const showings = await db.select('showing/showing/get_buyer', [ids])

  for (const showing of showings) {
    showing.slug = slug(showing.title)
  }

  return showings
}

/**
 * @param {UUID} id
 */
async function get(id) {
  const [result] = await getAll([id])
  return result
}

module.exports = {
  get,
  getAll,
  getAllForBuyer,
  getByHumanReadableId,
}
