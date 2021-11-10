const db = require('../../../../utils/db')

/**
 * @param {UUID} brandId
 * @param {string} event_type
 * @returns {Promise<{contact: UUID}[]>} contactIds
 */
async function get(brandId, event_type) {
  return db.select(
    'trigger/brand_trigger/exclusions/get_contacts', 
    [brandId, event_type]
  )
}
  
module.exports = { get }