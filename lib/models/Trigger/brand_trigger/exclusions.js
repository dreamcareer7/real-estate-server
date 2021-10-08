const db = require('../../../utils/db')
const BrandTrigger = require('./get')

/**
 * @param {UUID} brandTriggerId
 * @param {UUID[]} contactIds
 * @returns {Promise<void>}
 */
async function makeExclusion(brandTriggerId, contactIds) {
  const brandTrigger = await BrandTrigger.get(brandTriggerId)

  if (!brandTrigger) {
    return
  }

  await db.update(
    'trigger/brand_trigger/exclusions/create', 
    [brandTriggerId, JSON.stringify(contactIds.map(contactId => ({contact: contactId})))]
  )
}

/**
 * @param {UUID[]} brandTriggerIds
 * @returns {Promise<import('./types').BrandTriggerExclusion[]>} brandTriggersExclusions
 */
async function getExclusions(brandTriggerIds) {
  return await db.select(
    'trigger/brand_trigger/exclusions/get_for_brand_triggers', 
    [brandTriggerIds]
  )
}

/**
 * @param {UUID} brandTriggerId
 * @param {UUID[]} contactIds
*/
async function deleteExclusion(brandTriggerId, contactIds) {
  await db.update('trigger/brand_trigger/exclusions/delete', [brandTriggerId, contactIds])
}

module.exports = {
  makeExclusion,
  getExclusions,
  deleteExclusion,
}