const db  = require('../../../../utils/db')

/**
 * @param {UUID[]} ids
 * @returns {Promise<import('../types').SuperCampaignEmailCampaign[]>}
 */
const getAll = async ids => {
  return db.select('email/super_campaign/campaign/get', [ids])
}

module.exports = {
  getAll,
}
