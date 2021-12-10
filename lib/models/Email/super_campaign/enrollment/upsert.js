const db = require('../../../../utils/db')

/**
 * @typedef {import('../types').SuperCampaignEnrollmentInput} SuperCampaignEnrollmentInput
 * @typedef {import('../types').SuperCampaignEnrollment} SuperCampaignEnrollment
 * @typedef {import('../types').SuperCampaignStored} SuperCampaignStored 
 * @typedef {import('../types').SuperCampaignEnrollmentCause} SuperCampaignEnrollmentCause 
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
 * @param {SuperCampaignEnrollment['tags']} args.tags
 * @param {SuperCampaignEnrollmentCause=} [args.cause]
 * @param {SuperCampaignEnrollment['super_campaign']=} [args.superCampaignId]
 * @param {SuperCampaignEnrollment['brand']=} [args.brandId]
 * @param {SuperCampaignEnrollment['user']=} [args.userId]
 * @returns {Promise<number>}
 */
async function unionizeTags ({
  tags,
  cause,
  superCampaignId,
  brandId,
  userId,
}) {
  if (!tags?.length) { return 0 }

  return db.update(
    'email/super_campaign/enrollment/unionize_tags',
    [tags, cause, superCampaignId, brandId, userId]
  )
}

/**
 * Updates enrollments tags based on their related super campaign and optionally
 * their current tags (actually old tags). Does not affect automatic and admin
 * enrollments.
 * @param {Object} args
 * @param {SuperCampaignEnrollment['super_campaign']} args.superCampaignId
 * @param {SuperCampaignEnrollment['tags']} args.tags
 * @param {SuperCampaignEnrollment['tags']?=} args.oldTags=null
 */
async function synchronizeTags ({
  superCampaignId,
  tags,
  oldTags = null,
}) {
  return db.update('email/super_campaign/enrollment/synchronize_tags', [
    superCampaignId,
    tags,
    oldTags,
  ])
}

module.exports = {
  upsertMany,
  updateCampaigns,
  synchronizeTags,
  unionizeTags,
}
