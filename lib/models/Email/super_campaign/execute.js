const { strict: assert } = require('assert')
const zipWith = require('lodash/zipWith')
const isNil = require('lodash/isNil')

const SuperCampaign = {
  ...require('./update'),
  ...require('./lock'),
  ...require('./get'),
}
const Enrollment = {
  ...require('./enrollment/get'),
  ...require('./enrollment/upsert'),
}
const EmailCampaign = require('../campaign/create')
const Context = require('../../Context')

/**
 * @typedef {import('./types').SuperCampaignEnrollment} SuperCampaignEnrollment
 * @typedef {import('./types').SuperCampaignStored} SuperCampaignStored
 */

/** @param {SuperCampaignStored['id']} id */
async function execute(id) {
  Context.log(`Executing super campaign ${id}...`)

  const superCampaign = await SuperCampaign.get(id)
  if (!superCampaign) {
    return
  }

  const notExecuted = isNil(superCampaign.executed_at)
  assert(notExecuted, `Super campaign ${id} already executed`)

  await SuperCampaign.lock(id)
  Context.log(`Lock acquired for super campaign ${id}`)

  await createCampaigns(superCampaign)
  
  await SuperCampaign.markAsExecuted(id)
  Context.log(`Executing super campaign ${id} is now finished.`)
}

/** @param {SuperCampaignStored} superCampaign */
async function createCampaigns (superCampaign) {
  const { id } = superCampaign
  
  const enrollments = await Enrollment.filter({ super_campaign: id })
  if (!enrollments.length) {
    return
  }

  const toCampaignInput = mapToCampaignInput.bind(null, superCampaign)
  const campaignInputs = enrollments.map(toCampaignInput)

  Context.log(`Creating ${campaignInputs.length} email campaigns super campaign ${id}...`)
  const campaignIds = await EmailCampaign.createMany(campaignInputs)
  assert.equal(campaignIds.length, enrollments.length, 'Impossible State')
  Context.log(`Email campaigns were created successfully for super campaign ${id}.`)

  const updateCampaignsData = zipWith(enrollments, campaignIds, (e, c) => ({
    enrollment: e.id,
    campaign: c,
  }))
  await Enrollment.updateCampaigns(updateCampaignsData)
  Context.log(`Set email campaign ids on enrollment records for super campaign ${id}`)
}

/**
 * @param {SuperCampaignStored} superCampaign
 * @param {SuperCampaignEnrollment} enrollment
 * @returns {IEmailCampaignInput}
 */
function mapToCampaignInput(superCampaign, enrollment) {
  assert(!isNil(superCampaign.due_at), 'superCampaign.due_at cannot be nil')

  return {
    due_at: new Date(superCampaign.due_at * 1000).toISOString(),
    created_by: superCampaign.created_by,
    brand: enrollment.brand,
    individual: true,

    from: enrollment.user,
    to: enrollment.tags.map((tag) => ({ recipient_type: 'Tag', tag })),
    subject: superCampaign.subject ?? '',
    template: superCampaign.template_instance,
    notifications_enabled: enrollment.notifications_enabled,
  }
}

module.exports = {
  execute,
}
