const db  = require('../../../../utils/db')

/**
 * @param {UUID[]} ids
 * @returns {Promise<import('../types').SuperCampaignEnrollment[]>}
 */
const getAll = async ids => {
  return db.select('email/super_campaign/enrollment/get', [ids])
}

module.exports = {
  getAll,
}
