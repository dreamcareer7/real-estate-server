const db = require('../../../utils/db')
const promisify = require('../../../utils/promisify')
const slug = require('slug')

const Orm = require('../../Orm/context')
const Deal = require('../../Deal/get')
const DealContext = require('../../Deal/context/get')

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
 * @param {UUID} deal_id 
 * @returns {Promise<StdAddr | undefined>}
 */
async function getDealAddress(deal_id) {
  const deal = await promisify(Deal.get)(deal_id)
  return DealContext.getStreetAddress(deal)
}

/**
 * @param {UUID[]} ids
 * @returns {Promise<import('./types').ShowingPublic[]>}
 */
async function getAllForBuyer(ids) {
  /** @type {(import('./types').ShowingPublic & { deal: UUID | null; })[]} */
  const showings = await db.select('showing/showing/get_buyer', [ids])

  for (const showing of showings) {
    showing.slug = slug(showing.title)
    if (showing.deal) {
      showing.address = await getDealAddress(showing.deal)
    }
  }

  return showings
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
  getAllForBuyer
}
