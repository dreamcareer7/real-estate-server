const uniq = require('lodash/uniq')

const BrandTrigger = require('../get')
const BrandTriggerExclusion = require('../exclusion/get')
const Trigger = {
  ...require('../../get'),
  ...require('../../filter'),
}
const { createCampaignsAndTriggers } = require('./utils')

/**
 * @param {object} args
 * @param {IBrand['id']} args.brand_id
 * @param {UUID} args.flow_id
 * @param {UUID} args.contact_id
 */
async function flowStopped({ brand_id, flow_id, contact_id }) {
  const bts = await BrandTrigger.getForBrand(brand_id)
  if (!bts.length) {
    return
  }
  const trigger_ids = await Trigger.filter({
    flow: flow_id,
    deleted_at: true,
  })
  const triggers = await Trigger.getAll(  trigger_ids)
  /** @type {string[]} */
  const triggers_event_types = uniq(triggers.map(t => t.event_type))
  const relavant_bts = bts.filter(bt => triggers_event_types.includes(bt.event_type))

  for (const bt of relavant_bts) {
    const excludedContactIds = 
      await BrandTriggerExclusion.getExcludedContactIds(brand_id, bt.event_type)
    if (!excludedContactIds.includes(contact_id)) {
      await createCampaignsAndTriggers(bt, [contact_id])
    }
  }
}

module.exports = {
  flowStopped,
}