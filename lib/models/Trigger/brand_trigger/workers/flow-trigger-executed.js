const BrandTrigger = require('../get')
const BrandTriggerExclusion = require('../exclusion/get')
const Trigger = require('../../get')
const { createCampaignsAndTriggers } = require('./utils')

/**
 * @param {object} args
 * @param {IBrand['id']} args.brand_id
 * @param {UUID} args.trigger_id
 * @param {IContact['id']} args.contact_id
 * @param {number} args.timestamp
 */
async function flowTriggerExecuted({ brand_id, trigger_id, contact_id, timestamp }) {
  const bts = await BrandTrigger.getForBrand(brand_id)
  if (!bts.length) {
    return
  }
  const trigger = await Trigger.get(trigger_id)
  if (trigger.recurring) {
    return
  }
  const bt = bts.find(bt => bt.event_type === trigger.event_type)
  if (!bt) {
    return
  }
  const isExcluded = await BrandTriggerExclusion.isExcluded(
    brand_id,
    bt.event_type,
    contact_id,
  )
  if (!isExcluded) {
    // what if we have another flow?!
    await createCampaignsAndTriggers(
      bt,
      [contact_id],
      { 
        effective_at: new Date(
          (timestamp - trigger.wait_for + 1 * 86400) * 1000
        ).toISOString(),
      }
    )
  }
}

module.exports = {
  flowTriggerExecuted,
}
