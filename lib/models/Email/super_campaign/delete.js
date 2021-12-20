const db = require('../../../utils/db')

/** @typedef {import('./types').SuperCampaignStored} SuperCampaignStored */

/**
 * @param {SuperCampaignStored['id'][]} ids
 * @returns {Promise<number>}
 */
async function deleteSuperCampaigns (ids) {
  if (!ids.length) { return 0 }

  // XXX: Do we have to delete related enrollments as well?
  
  return db.update('email/super_campaign/delete', [ids])
}

module.exports = { delete: deleteSuperCampaigns }
