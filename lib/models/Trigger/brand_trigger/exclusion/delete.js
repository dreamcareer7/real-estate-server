const db = require('../../../../utils/db')
const BrandTrigger = {
  ...require('../workers'),
  ...require('../get')
}

/**
 * @param {UUID} brandId
 * @param {string} event_type
 * @param {UUID[]} contactIds
 * @returns {Promise<void>}
 */
async function deleteExclusions(brandId, event_type, contactIds) {
  if (!contactIds.length) {
    return
  }
  await db.update('trigger/brand_trigger/exclusions/delete', [brandId, event_type, contactIds])
  const brandTrigger = (await BrandTrigger.getForBrand(brandId)).find(
    (bt) => bt.event_type === event_type
  )
  if (!brandTrigger) {
    return
  }
  await BrandTrigger.triggersAndCampaignsCreator(brandTrigger, contactIds)
}

module.exports = { delete: deleteExclusions }