const db = require('../../../utils/db')
const BrandTrigger = {
  ...require('./workers'),
  ...require('./get'),
}
const Trigger = {
  ...require('../delete'),
  ...require('../filter'),
}
/**
 * @param {UUID} brandTriggerId
 * @param {boolean} enable
 * @returns {Promise<void>}
 */
async function toggle (brandTriggerId, enable) {
  await db.update('trigger/brand_trigger/toggle', [
    enable,
    brandTriggerId,
  ])
  if (enable) {
    await BrandTrigger.updateTriggers(brandTriggerId, false)
  } else {
    const brandTrigger = await BrandTrigger.get(brandTriggerId)
    const triggerIds = await Trigger.filter({
      effectively_executed: false,
      action: ['schedule_email'],
      deleted_at: null,
      origin: brandTriggerId,
    })
    await Trigger.delete(triggerIds, brandTrigger.created_by)
  }
}

module.exports = {
  toggle,
}
