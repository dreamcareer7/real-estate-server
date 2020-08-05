const db = require('../../../utils/db.js')


/**
 * @param {UUID} id
 * @param {string} campaign
 */
const setCampaign = async (id, campaign) => {
  return db.update('google/message/set_campaign', [id, campaign])
}


module.exports = {
  setCampaign
}