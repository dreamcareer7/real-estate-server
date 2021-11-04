const db = require('../../../utils/db')

/**
 * @param {UUID} super_campaign 
 * @param {UUID[]} brands_to_delete 
 * @param {UUID[]} brands_to_insert
 */
async function updateEligibility(super_campaign, brands_to_delete, brands_to_insert) {
  await updateEnrollments(super_campaign, brands_to_delete, brands_to_insert)

  return db.query.promise('email/super_campaign/update_eligibility', [
    super_campaign,
    brands_to_delete,
    brands_to_insert,
  ])
}

/**
 * @param {UUID} super_campaign
 * @param {UUID[]} brands_to_delete
 * @param {UUID[]} brands_to_insert
 */
async function updateEnrollments(super_campaign, brands_to_delete, brands_to_insert) {
  return db.query.promise('email/super_campaign/enrollment/update', [
    super_campaign,
    brands_to_delete,
    brands_to_insert,
  ])  
}

/**
 * @param {UUID} superCampaignId
 * @returns {Promise<IBrand['id'][]>}
 */
async function getEligibleBrands (superCampaignId) {
  return db.map(
    'email/super_campaign/eligible_brands',
    [superCampaignId],
    'brand'
  )
}

module.exports = {
  updateEligibility,
  updateEnrollments,
  getEligibleBrands,
}
