const db = require('../../../utils/db')

/**
 * @param {UUID} super_campaign
 * @param {Omit<import('./types').SuperCampaignApiInput, 'eligibility' | 'tags'>} data 
 */
function update(super_campaign, data) {
  return db.update('email/super_campaign/update', [
    super_campaign,
    data.subject,
    data.description,
    data.due_at,
    data.template_instance
  ])
}

/**
 * @param {UUID} super_campaign
 * @param {string[]} tags
 */
async function updateTags(super_campaign, tags) {
  await db.update('email/super_campaign/update_tags', [
    super_campaign,
    tags
  ])

  // TODO: update enrollments
}

/**
 * @param {UUID} super_campaign 
 * @param {UUID[]} brands 
 */
function updateBrands(super_campaign, brands) {
  return db.query.promise('email/super_campaign/update_eligibility', [
    super_campaign,
    brands
  ])
}

module.exports = {
  update,
  updateTags,
  updateBrands,
}
