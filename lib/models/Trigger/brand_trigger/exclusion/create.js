const db = require('../../../../utils/db')

/**
 * @param {UUID} brandId
 * @param {string} event_type
 * @param {UUID[]} contactIds
 * @returns {Promise<void>}
 */
async function create(brandId, event_type, contactIds) {
  try {
    await db.update(
      'trigger/brand_trigger/exclusions/create', 
      [brandId, event_type, contactIds]
    )
  } catch (/** @type {any} */ err) {
    switch (err.constraint) {
      case 'brand_triggers_exclusions_brand_fkey':
        throw Error.Validation('brand does not exist')
      case 'brand_triggers_exclusions_contact_fkey':
        throw Error.Validation('contact does not exist')
      default:
        throw err
    }
  }
}
  
module.exports = { create }