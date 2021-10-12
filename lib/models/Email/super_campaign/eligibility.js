const db = require('../../../utils/db')

/**
 * @param {UUID} super_campaign 
 * @param {UUID[]} brands 
 */
function updateEligibility(super_campaign, brands) {
  return db.query.promise('email/super_campaign/update_eligibility', [
    super_campaign,
    brands
  ])
}

module.exports = {
  updateEligibility
}
