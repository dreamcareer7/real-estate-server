const { updateTriggers } = require('./workers')
const db = require('../../../utils/db')

/** @typedef {import('./types').BrandTriggerInput} BrandTriggerInput */

/**
 * @param {BrandTriggerInput} bt
 * @param {boolean} overrideManualTriggers
 * @returns {Promise<UUID>}
 */
async function upsert(bt, overrideManualTriggers) {
  const btId = await insert(bt)

  updateTriggers(btId, overrideManualTriggers)

  return btId
}

/**
 *
 * @param {BrandTriggerInput} bt
 * @returns {Promise<UUID>}
 */
function insert(bt) {
  return db.insert('trigger/brand_trigger/upsert', [
    bt.brand,
    bt.created_by,
    bt.template,
    bt.template_instance,
    bt.event_type,
    bt.wait_for,
    bt.subject,
  ])
}

module.exports = {
  upsert,
  insert,
}
