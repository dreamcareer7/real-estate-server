const db = require('../../../utils/db')

/**
 * @param {object} options
 * @param {UUID} options.brandId
 * @param {UUID} options.brandTriggerId
 * @param {boolean} options.enable
 * @returns {Promise<number>}
 */
async function toggle ({ brandId, brandTriggerId, enable }) {
  return db.update('trigger/brand_trigger/toggle', [
    enable,
    brandTriggerId,
    brandId,
  ])
}

module.exports = {
  toggle,
}
