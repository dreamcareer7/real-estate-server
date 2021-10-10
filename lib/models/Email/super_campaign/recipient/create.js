const db = require('../../../../utils/db')

/**
 * @param {UUID} super_campaign 
 * @param {import('../types').SuperCampaignRecipientInput[]} recipients 
 */
async function create(super_campaign, recipients) {
  await db.query.promise('email/super_campaign/recipient/insert', [super_campaign, JSON.stringify(recipients)])
}

module.exports = {
  create,
}
