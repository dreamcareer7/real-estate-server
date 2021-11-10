const { COMMON_TRIGGER_FILTERS, createCampaignsAndTriggers } = require('./utils')
const Trigger = {
  ...require('../../get'),
  ...require('../../filter'),
  ...require('../../delete'),
}
const BrandTrigger = require('../get')
const BrandTriggerExclusion = {
  ...require('../exclusion/create'),
  ...require('../exclusion/get')
}

/**
 * @param {UUID} brandTriggerId
 * @param {boolean | undefined} [overrideManualTriggers]
 */
async function updateTriggersHandler(brandTriggerId, overrideManualTriggers) {
  const bt = await BrandTrigger.get(brandTriggerId).catch(() => null)
  if (!bt) {
    return
  }
    
  let triggerIdsToRemove
  
  if (overrideManualTriggers) {
    triggerIdsToRemove = await Trigger.filter({
      ...COMMON_TRIGGER_FILTERS,
      brand: bt.brand,
      event_type: [bt.event_type],
    })
      
  }
    
  else {
    const manualTriggerIds = await Trigger.filter({
      ...COMMON_TRIGGER_FILTERS,
      brand: bt.brand,
      event_type: [bt.event_type],
      origin: null,
    })
    const manualTriggers = await Trigger.getAll(manualTriggerIds)
    const exclusions = await BrandTriggerExclusion.get(bt.brand, bt.event_type)
    await BrandTriggerExclusion.create(
      bt.brand,
      bt.event_type,
      manualTriggers
        .filter(trigger=>!exclusions.find(excl=>excl.contact === trigger.contact))
        .map(trigger => trigger.contact)
    )
    triggerIdsToRemove = await Trigger.filter({
      ...COMMON_TRIGGER_FILTERS,
      brand: bt.brand,
      event_type: [bt.event_type],
      origin: true,
    })
  }
  
  if (triggerIdsToRemove.length) {
    await Trigger.delete(triggerIdsToRemove, bt.created_by)
  }
  
  const contactIds = await BrandTrigger.getContactIdsToCreateTriggerFor({
    brandId: bt.brand,
    eventType: bt.event_type,
  })
  if (!contactIds.length) {
    return
  }
  
  await createCampaignsAndTriggers(bt, contactIds)
}

module.exports = {
  updateTriggersHandler
}