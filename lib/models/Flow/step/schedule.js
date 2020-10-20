const { expect } = require('chai')

const BrandEmail = require('../../Brand/email/get')
const BrandFlowStep = require('../../Brand/flow_step/get')
const EmailCampaign = require('../../Email/campaign/create')
const Trigger = require('../../Trigger/create')
const Contact = require('../../Contact/get')
const Email = require('../../Email/constants')

const Flow = require('../get')
const FlowStep = require('./get')

/**
 * @param {UUID} id flow step id
 */
async function scheduleStep(id) {
  const step = await FlowStep.get(id)
  const flow = await Flow.get(id)
  const origin = await BrandFlowStep.get(step.origin)

  if (origin.email) {
    await scheduleEmailTrigger(flow, step, origin)
  } else {
    await scheduleEventTrigger(flow, step, origin)
  }
}

/**
 * @param {IFlow} flow
 * @param {IFlowStep} step
 * @param {IBrandFlowStep} origin
 */
async function scheduleEventTrigger(flow, step, origin) {
  return Trigger.create({
    action: 'create_event',
    brand: flow.brand,
    created_by: step.created_by,
    event_type: 'flow_start',
    user: step.created_by,
    brand_event: origin.event,
    contact: flow.contact,
    flow: flow.id,
    flow_step: step.id,
    wait_for: origin.due_in
  })
}

/**
 * @param {IFlow} flow
 * @param {IFlowStep} step
 * @param {IBrandFlowStep} origin
 */
async function scheduleEmailTrigger(flow, step, origin) {
  const campaign_id = await createDraftCampaign(flow, origin)

  return Trigger.create({
    action: 'schedule_email',
    brand: flow.brand,
    created_by: step.created_by,
    event_type: 'flow_start',
    user: step.created_by,
    campaign: campaign_id,
    contact: flow.contact,
    flow: flow.id,
    flow_step: step.id,
    wait_for: origin.due_in
  })
}

/**
 * 
 * @param {IFlow} flow 
 * @param {IBrandFlowStep} origin 
 */
async function createDraftCampaign(flow, origin) {
  const contact = await Contact.get(flow.contact)
  expect(contact.email, 'Cannot schedule an email for a contact without any email addresses').not.be.null.and.not.be.undefined

  const brand_email = await BrandEmail.get(origin.email)

  /** @type {IEmailCampaignInput} */
  const campaign = {
    created_by: flow.created_by,
    brand: flow.brand,
    due_at: null,
    from: flow.created_by,
    html: brand_email.body,
    subject: brand_email.subject,
    individual: true,
    to: [{
      contact: flow.contact,
      email: /** @type {string} */(contact.email),
      recipient_type: Email.EMAIL
    }]
  }

  const [campaign_id] = await EmailCampaign.createMany([campaign])
  return campaign_id
}

module.exports = {
  scheduleStep,
}
