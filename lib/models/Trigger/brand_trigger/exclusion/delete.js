const db = require('../../../../utils/db')
const BrandTrigger = {
  ...require('../workers'),
  ...require('../get')
}

/**
 * @param {UUID} brandId
 * @param {string} eventType
 * @param {UUID[]} contactIds
 * @returns {Promise<void>}
 */
async function deleteExclusions(brandId, eventType, contactIds) {
  if (!contactIds.length) {
    return
  }
  await db.update('trigger/brand_trigger/exclusions/delete', [brandId, eventType, contactIds])
  const brandTrigger = (await BrandTrigger.getForBrand(brandId)).find(
    (bt) => bt.event_type === eventType
  )
  if (!brandTrigger) {
    return
  }
  await BrandTrigger.createTriggersAfterExclusionIsDeleted(brandTrigger, contactIds)
}

module.exports = { delete: deleteExclusions }