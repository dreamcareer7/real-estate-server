const db  = require('../../../../utils/db')

/**
 * @param {UUID[]} ids
 * @returns {Promise<import('../types').SuperCampaignRecipient[]>}
 */
const getAll = async ids => {
  return db.select('email/super_campaign/recipient/get', [ids])
}

module.exports = {
  getAll,
}
