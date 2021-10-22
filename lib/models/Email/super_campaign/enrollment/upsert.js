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

module.exports = {
  upsertMany,
}
