const db = require('../../../utils/db')

const { updateEligibility } = require('./eligibility')

/**
 * @param {import('./types').SuperCampaignInput} data 
 * @returns {Promise<UUID>}
 */
async function insert(data) {
  return db.insert('email/super_campaign/insert', [
    data.created_by,
    data.brand,
    data.subject,
    data.description,
    data.due_at,
    data.tags,
    data.template_instance
  ])
}

/**
 * @param {import('./types').SuperCampaignApiInput} data 
 * @param {UUID} user
 * @param {UUID} brand
 * @returns {Promise<UUID>}
 */
async function create(data, user, brand) {
  const id = await insert({ ...data, created_by: user, brand })
  if (data.eligible_brands) {
    await updateEligibility(id, [], data.eligible_brands)
  }

  return id
}

module.exports = {
  create,
}
