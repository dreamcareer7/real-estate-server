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
  
module.exports = { getExcludedContactIds }