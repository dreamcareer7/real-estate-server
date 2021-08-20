const db = require('../../../utils/db')

/** @typedef {import('./types').BrandTrigger} BrandTrigger */

/**
 * @param {BrandTrigger} bt
 * @returns {Promise<UUID>}
 */
async function upsert (bt) {
  return db.insert('trigger/brand_trigger/upsert', [
    bt.brand,
    bt.user,
    bt.template,
    bt.template_instance,
    bt.event_type,
    bt.wait_for,
    bt.subject,
  ])
}

module.exports = {
  upsert,
}
