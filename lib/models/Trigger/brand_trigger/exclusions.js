const db = require('../../../utils/db')

/**
 * @param {UUID} brandId
 * @param {string} event_type
 * @param {UUID[]} contactIds
 * @returns {Promise<void>}
 */
async function makeExclusion(brandId, event_type, contactIds) {
  try {
    await db.update(
      'trigger/brand_trigger/exclusions/create', 
      [brandId, event_type, contactIds]
    )
  } catch (/** @type any */ err) {
    switch (err.constraint) {
      case 'brand_triggers_exclusions_pkey':
        throw Error.Conflict('exclusion already exists')
      case 'brand_triggers_exclusions_brand_fkey':
        throw Error.Validation('brand does not exist')
      case 'brand_triggers_exclusions_contact_fkey':
        throw Error.Validation('contact does not exist')
      default:
        throw err
    }
  }
}

/**
 * @param {UUID} brandId
 * @param {string} event_type
 * @returns {Promise<{contact: UUID}[]>} contactIds
 */
async function getExclusions(brandId, event_type) {
  return db.select(
    'trigger/brand_trigger/exclusions/get_contacts', 
    [brandId, event_type]
  )
}

/**
 * @param {UUID} brandId
 * @param {string} event_type
 * @param {UUID[]} contactIds
 * @returns {Promise<void>}
 */
async function deleteExclusion(brandId, event_type, contactIds) {
  await db.update('trigger/brand_trigger/exclusions/delete', [brandId, event_type, contactIds])
}

module.exports = {
  makeExclusion,
  getExclusions,
  deleteExclusion,
}