const db = require('../../../../utils/db')

/**
 * @param {import('../types').SuperCampaignEmailCampaignInput[]} data 
 */
async function create(data) {
  await db.query.promise('email/super_campaign/campaign/insert', [JSON.stringify(data)])
}

module.exports = {
  create,
}
