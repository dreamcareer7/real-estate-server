const db = require('../../../utils/db')
const BrandTrigger = require('./get')
const Trigger = {
  ...require('../delete'),
  ...require('../filter'),
}


/**
 * @param {UUID} brandTriggerId
 * @param {UUID[]} contactIds
 * @returns {Promise<UUID[] | undefined>} brandTriggersExclusionIds
 */
async function makeExclusion(brandTriggerId, contactIds) {
  const brandTrigger = await BrandTrigger.get(brandTriggerId)

  if (!brandTrigger) {
    return
  }

  const [triggerId] = await Trigger.filter({
    effectively_executed: false,
    deleted_at: null,
    is_global: true,
    brand: brandTrigger.brand,
    event_type: [brandTrigger.event_type],
    contacts: contactIds,
  })
	
  await Trigger.delete([triggerId], brandTrigger.created_by)

  return await Promise.all(contactIds.map(async contactId => await db.insert(
    'trigger/brand_trigger/exclusions/create', 
    [brandTriggerId, contactId]
  )))
}

/**
 * @param {UUID} brandTriggerId
 * @returns {Promise<import('./types').BrandTriggerExclusion[]>} brandTriggersExclusions
 */
async function getExclusions(brandTriggerId) {
  return await db.select(
    'trigger/brand_trigger/exclusions/get_for_brand_triggers', 
    [[brandTriggerId]]
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