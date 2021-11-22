const { createCampaignsAndTriggers } = require('./utils')
const BrandTrigger = require('../get')


/** @typedef {import('../types').BrandTrigger} BrandTrigger */

/**
 * @param {BrandTrigger} bt
 * @param {IContact['id'][]} contactIds
 */
async function createTriggersAfterExclusionIsDeleted(bt, contactIds) {
  const candidateContacts = await BrandTrigger.getContactIdsToCreateTriggerFor({
    brandId: bt.brand,
    eventType: bt.event_type,
  })
  const contactsToCreateTriggers = contactIds.filter((id) => candidateContacts.includes(id))
  if (!contactsToCreateTriggers.length) {
    return
  }
  await createCampaignsAndTriggers(bt, contactsToCreateTriggers)
}

module.exports = { createTriggersAfterExclusionIsDeleted }