const db = require('../../../utils/db')

// TODO define ts types in types.d.ts
/** @typedef {any} BrandTrigger */

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

module.exports = {
  getAll,
  get,
}
