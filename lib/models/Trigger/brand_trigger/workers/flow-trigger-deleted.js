const BrandTrigger = require('../get')
const Trigger = require('../../get')
const { createCampaignsAndTriggers } = require('./utils')

/**
 * @param {object} args
 * @param {IBrand['id']} args.brand_id
 * @param {UUID} args.trigger_id
 * @param {IContact['id']} args.contact_id
 */
async function flowTriggerDeleted({brand_id, trigger_id, contact_id}) {
  const bts = await BrandTrigger.getForBrand(brand_id)
  if (!bts.length) {
    return
  }
  const trigger = await Trigger.get(trigger_id)

  const bt = bts.find(bt => bt.event_type === trigger.event_type)
  if (!bt) {
    return
  }
  await createCampaignsAndTriggers(bt, [contact_id])
}

module.exports = {
  flowTriggerDeleted,
}