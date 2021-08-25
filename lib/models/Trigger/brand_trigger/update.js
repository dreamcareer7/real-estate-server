const db = require('../../../utils/db')

/**
 * @param {UUID} brandTriggerId
 * @param {boolean} enable
 * @returns {Promise<number>}
 */
async function toggle (brandTriggerId, enable) {
  return db.update('trigger/brand_trigger/toggle', [
    enable,
    brandTriggerId,
  ])
}

module.exports = {
  toggle,
}
