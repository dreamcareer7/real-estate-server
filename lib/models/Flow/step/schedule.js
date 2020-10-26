const { expect } = require('chai')

const promisify = require('../../../utils/promisify')

const AttachedFile = require('../../AttachedFile/index')
const Brand = {
  ...require('../../Brand/get'),
  ...require('../../Brand/constants'),
}
const BrandEmail = require('../../Brand/email/get')
const BrandFlow = require('../../Brand/flow/get')
const BrandFlowStep = require('../../Brand/flow_step/get')
const EmailCampaign = require('../../Email/campaign/create')
const Trigger = require('../../Trigger/create')
const Template = require('../../Template/get')
const TemplateInstance = require('../../Template/instance/get')
const Contact = require('../../Contact/get')
const Email = require('../../Email/constants')
const User = require('../../User/get')

const renderTemplate = require('../../Template/thumbnail/render')

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
 * @param {import('../../Brand/flow_step/types').IStoredBrandFlowStep} origin
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
 * @param {import('../../Brand/flow_step/types').IStoredBrandFlowStep} origin
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
 * @param {IFlow} flow 
 * @param {import('../../Brand/flow_step/types').IStoredBrandFlowStep} origin 
 */
async function createDraftCampaign(flow, origin) {
  const contact = await Contact.get(flow.contact)
  expect(contact.email, 'Cannot schedule an email for a contact without any email addresses').not.be.null.and.not.be.undefined

  /** @type {IEmailCampaignInput} */
  const campaign = {
    created_by: flow.created_by,
    brand: flow.brand,
    due_at: null,
    from: flow.created_by,
    html: await getCampaignBody(origin, flow),
    subject: '', // brand_email.subject,
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

/**
 * @param {import('../../Brand/flow_step/types').IStoredBrandFlowStep} origin
 * @param {IFlow} flow
 */
async function getCampaignBody(origin, flow) {
  if (origin.email) {
    return getHtmlFromBrandEmail(origin.email)
  }

  if (origin.template_instance) {
    return getHtmlFromTemplateInstance(origin.template_instance)
  }

  if (origin.template) {
    return getHtmlFromTemplate(origin, flow, origin.template)
  }

  throw new Error('A brand_flow_step object should have an email, or a template or a template_instance.')
}

/**
 * @param {UUID} brand_email_id 
 */
async function getHtmlFromBrandEmail(brand_email_id) {
  const brand_email = await BrandEmail.get(brand_email_id)
  return brand_email.body
}

/**
 * @param {UUID} template_instance_id 
 */
async function getHtmlFromTemplateInstance(template_instance_id) {
  const instance = await TemplateInstance.get(template_instance_id)
  return instance.html
}

/**
 * @param {import('../../Brand/flow_step/types').IStoredBrandFlowStep} origin 
 * @param {IFlow} flow
 * @param {UUID} template_id 
 */
async function getHtmlFromTemplate(origin, flow, template_id) {
  const { brand } = await BrandFlow.get(origin.flow)
  const template = await Template.get(template_id)
  const user = await User.get(flow.created_by)

  const parent_ids = await Brand.getParents(brand)
  const parents = await Brand.getAll(parent_ids)

  let brokerage_brand
  for(const parent of parents) {
    if (parent.brand_type !== Brand.BROKERAGE)
      continue

    brokerage_brand = parent
    break
  }

  const html = (await promisify(AttachedFile.download)(template.file)).toString()

  return renderTemplate({
    html,
    template,
    brand: brokerage_brand,
    variables: {
      user,
      // contact,
      // listing
    }
  })
}

module.exports = {
  scheduleStep,
}
