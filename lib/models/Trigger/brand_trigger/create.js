const { createTriggers, updateTriggers} = require('./workers')
const db = require('../../../utils/db')
const BrandTrigger = require('./get')

/** @typedef {import('./types').BrandTrigger} BrandTrigger */

/**
 * @param {BrandTrigger} bt
 * @param {boolean} overrideManualTriggers
 * @returns {Promise<UUID>}
 */
async function upsert (bt, overrideManualTriggers) {
  const isUpdate = await BrandTrigger.exists(bt.brand, bt.event_type)
  
  const btId = await db.insert('trigger/brand_trigger/upsert', [
    bt.brand,
    bt.created_by,
    bt.template,
    bt.template_instance,
    bt.event_type,
    bt.wait_for,
    bt.subject,
  ])

  const handleUpsert = isUpdate ? updateTriggers : createTriggers
  handleUpsert(btId, overrideManualTriggers)

  return btId
}

module.exports = {
  upsert,
}
