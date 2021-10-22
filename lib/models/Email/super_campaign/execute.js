const { strict: assert } = require('assert')
const isNil = require('lodash/isNil')

const SuperCampaign = {
  ...require('./update'),
  ...require('./lock'),
  ...require('./get'),
}
const Enrollment = require('./enrollment/get')
const EmailCampaign = require('../campaign/create')

/** 
 * @typedef {import('./types').SuperCampaignEnrollment} SuperCampaignEnrollment
 * @typedef {import('./types').SuperCampaignStored} SuperCampaignStored
 */

/** @param {SuperCampaignStored['id']} id */
async function execute (id) {
  const superCampaign = await SuperCampaign.get(id)
  if (!superCampaign) { return }

  const alreadyExecuted = !isNil(superCampaign.executed_at)
  assert(alreadyExecuted, `Super campaign ${id} already executed`)

  await SuperCampaign.lock(id)

  const enrollments = await Enrollment.filter({ super_campaign: id })
  if (!enrollments.length) { return }
  
  const toCampaignInput = mapToCampaignInput.bind(null, superCampaign)
  const campaignInputs = enrollments.map(toCampaignInput)
  
  await EmailCampaign.createMany(campaignInputs)
  await SuperCampaign.markAsExecuted(id)
}

/**
 * @param {SuperCampaignStored} superCampaign
 * @param {SuperCampaignEnrollment} enrollment
 * @returns {IEmailCampaignInput}
 */
function mapToCampaignInput (superCampaign, enrollment) {
  assert(!isNil(superCampaign.due_at), 'superCampaign.due_at cannot be nil')
  
  return {
    due_at: new Date(superCampaign.due_at).toISOString(),
    created_by: superCampaign.created_by,
    brand: enrollment.brand,
    individual: true,
    
    from: enrollment.user,
    to: enrollment.tags.map(tag => ({ recipient_type: 'Tag', tag })),
    subject: superCampaign.subject ?? '',
    template: superCampaign.template_instance,
  }
}

module.exports = {
  execute,
}
