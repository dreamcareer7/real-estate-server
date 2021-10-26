const db = require('../../../../utils/db')

/**
 * @typedef {import('../types').SuperCampaignEnrollmentInput} SuperCampaignEnrollmentInput
 * @typedef {import('../types').SuperCampaignEnrollment} SuperCampaignEnrollment
 * @typedef {import('../types').SuperCampaignStored} SuperCampaignStored 
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

/**
 * @param {Object} args
 * @param {SuperCampaignEnrollment['tags']} args.newTags
 * @param {SuperCampaignStored['id']} args.superCampaignId
 * @param {SuperCampaignEnrollment['tags']?=} [args.oldTags]
 */
async function synchronizeTags ({
  newTags,
  superCampaignId,
  oldTags,
}) {
  return db.update('email/super_campaign/enrollment/synchronize_tags', [
    newTags,
    superCampaignId,
    oldTags,
  ])
}

module.exports = {
  upsertMany,
  updateCampaigns,
  synchronizeTags,
}
