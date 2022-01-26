const { strict: assert } = require('assert')
const difference = require('lodash/difference')

const db = require('../../../utils/db')
const { get } = require('./get')
const {
  updateEligibility,
  updateEnrollments,
  getEligibleBrands,
} = require('./eligibility')

const Enrollment = {
  ...require('./enrollment/upsert'),
  ...require('./enrollment/delete'),
}

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
  ]).catch(err => {
    if (err?.constraint === 'null_due_at_if_null_template_instance') {
      throw Error.Validation(
        'Cannot set value for `due at` when `template instance` is null'
      )
    }

    throw err
  })
}

/**
 * @param {UUID} super_campaign
 * @param {string[]} tags
 */
async function updateTags(super_campaign, tags) {
  const result = await db.update('email/super_campaign/update_tags', [
    super_campaign,
    tags
  ])

  const eligibleBrandIds = await getEligibleBrands(super_campaign)
  if (!eligibleBrandIds.length) { return result }
  
  await Enrollment.unionizeTags({
    superCampaignId: super_campaign,
    cause: 'manual',
    tags,
  })

  await Enrollment.hardDeleteBy({
    superCampaignId: super_campaign,
    cause: 'automatic',
    optedOut: false,
  })
  
  await updateEnrollments(super_campaign, [], eligibleBrandIds)

  return result
}

/**
 * @param {UUID} super_campaign 
 * @param {UUID[]} brands 
 */
async function updateBrands(super_campaign, brands) {
  const { eligible_brands } = await get(super_campaign)

  const to_delete = difference(eligible_brands, brands)
  const to_insert = difference(brands, eligible_brands)

  return updateEligibility(
    super_campaign,
    to_delete,
    to_insert,
  )
}

/** @param {UUID} superCampaignId */
async function markAsExecuted (superCampaignId) {
  const affectedRows = await db.update(
    'email/super_campaign/mark_as_executed',
    [superCampaignId]
  )

  assert(affectedRows === 1, `Super campaign ${superCampaignId} is not exist or already executed`)
}

module.exports = {
  update,
  updateTags,
  updateBrands,
  markAsExecuted,
}
