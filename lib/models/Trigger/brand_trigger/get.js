const db = require('../../../utils/db')

/** @typedef {import('./types').BrandTrigger} BrandTrigger */

/**
 * @param {UUID[]} brandTriggerIds
 * @returns {Promise<BrandTrigger[]>}
 */
async function getAll (brandTriggerIds) {
  return db.select('trigger/brand_trigger/get', [brandTriggerIds])
}

/**
 * @param {UUID} brandTriggerId
 * @returns {Promise<BrandTrigger>}
 */
async function get (brandTriggerId) {
  const brandTriggers = await getAll([brandTriggerId])

  if (brandTriggers?.length !== 1) {
    throw Error.ResourceNotFound(`BrandTrigger ${brandTriggerId} not found`)
  }

  return brandTriggers[0]
}

/**
 * @param {UUID} brandId
 * @returns {Promise<BrandTrigger[]>}
 */
async function getForBrand (brandId) {
  const ids = await db.selectIds(
    'trigger/brand_trigger/get_for_brand',
    [brandId]
  )

  return ids?.length ? getAll(ids) : []
}

/**
 * @param {UUID} brandId
 * @param {string} eventType
 */
async function exists (brandId, eventType) {
  const bts = await getForBrand(brandId)
  return bts.some(bt => bt.event_type === eventType)
}

/**
 * @param {object} options
 * @param {UUID} options.brandId
 * @param {string} options.eventType
 */
async function getContactIdsToCreateTriggerFor ({ brandId, eventType }) {
  return db.selectIds('trigger/brand_trigger/contact_ids_to_create_trigger_for', [
    brandId,
    eventType
  ])
}

module.exports = {
  getAll,
  get,
  getForBrand,
  exists,
  getContactIdsToCreateTriggerFor,
}
