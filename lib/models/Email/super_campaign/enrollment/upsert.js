const db = require('../../../../utils/db')

/**
 * @typedef {import('../types').SuperCampaignEnrollmentInput} SuperCampaignEnrollmentInput
 * @typedef {import('../types').SuperCampaignEnrollment} SuperCampaignEnrollment 
 */

/**
 * @param {SuperCampaignEnrollmentInput[]} data 
 * @returns {Promise<SuperCampaignEnrollment['id'][]>}
 */
async function upsertMany (data) {
  return db.selectIds(
    'email/super_campaign/enrollment/upsert_many',
    [JSON.stringify(data)]
  )
}

/**
 * @typedef {Object} UpdateCampaignsData
 * @property {SuperCampaignEnrollment['id']} enrollment
 * @property {IEmailCampaign['id']} campaign
 *
 * @param {UpdateCampaignsData[]} data
 */
async function updateCampaigns (data) {
  return db.update(
    'email/super_campaign/enrollment/update_campaigns',
    [JSON.stringify(data)]
  )
}

module.exports = {
  upsertMany,
  updateCampaigns,
}
