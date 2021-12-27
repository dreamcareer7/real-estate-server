const db = require('../../../../utils/db')

/**
 * @param {UUID} brandId
 * @param {string} eventType
 * @returns {Promise<UUID[]>} contactIds
 */
async function getExcludedContactIds(brandId, eventType) {
  return db.map(
    'trigger/brand_trigger/exclusions/get_contacts', 
    [brandId, eventType],
    'contact',
  )
}
  
/**
 * @param {UUID} brandId
 * @param {string} eventType
 * @param {UUID} contactId
 * @returns {Promise<boolean>}
 */
async function isExcluded(brandId, eventType, contactId) {
  const exclusions = await db.select(
    'trigger/brand_trigger/exclusions/find_specific', 
    [brandId, eventType, contactId],
  )
  return Boolean(exclusions.length)
}

module.exports = { getExcludedContactIds, isExcluded }