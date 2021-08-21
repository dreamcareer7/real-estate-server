const moment = require('moment')

const promisify = require('../../../utils/promisify')
const AttachedFile = require('../../AttachedFile/index')
const Brand = {
  ...require('../../Brand/get'),
  ...require('../../Brand/constants'),
}
const BrandEmail = require('../../Brand/email/get')
const EmailCampaign = require('../../Email/campaign/create')
const Trigger = require('../../Trigger/create')
const BrandTemplate = require('../../Template/brand/get')
const Template = require('../../Template/get')
const Email = require('../../Email/constants')
const User = require('../../User/get')
const Orm = require('../../Orm/index')

const renderTemplate = require('../../Template/thumbnail/render')

const Flow = require('../get')
const FlowStep = require('./get')
const { TriggerError } = require('../../Trigger/error')

/**
 * @param {UUID[]} step_ids flow step id
 * @param {import('../../Brand/flow_step/types').IStoredBrandFlowStep} origin
 * @param {UUID} user_id
 * @param {UUID} brand_id
 */
async function scheduleSteps(step_ids, origin, user_id, brand_id) {
  const steps = await FlowStep.getAll(step_ids)
  const flows = await Flow.getAll(steps.map(s => s.flow))

  if (origin.event) {
    await scheduleEventTrigger(flows, steps, origin, user_id, brand_id)
  } else {
    await scheduleEmailTrigger(flows, steps, origin, user_id, brand_id)
  }
}

/**
 * @param {IFlow[]} flows
 * @param {IFlowStep[]} steps
 * @param {import('../../Brand/flow_step/types').IStoredBrandFlowStep} origin
 * @param {UUID} user_id
 * @param {UUID} brand_id
 */
async function scheduleEventTrigger(flows, steps, origin, user_id, brand_id) {
  return Trigger.create(flows.map((flow, i) => ({
    action: 'create_event',
    brand: brand_id,
    created_by: user_id,
    event_type: origin.event_type,
    user: user_id,
    brand_event: origin.event,
    contact: flow.contact,
    flow: flow.id,
    flow_step: steps[i].id,
    wait_for: moment.duration(origin.wait_for).asSeconds(),
    time: origin.time,
  })))
}

/**
 * @param {IFlow[]} flows
 * @param {IFlowStep[]} steps
 * @param {import('../../Brand/flow_step/types').IStoredBrandFlowStep} origin
 * @param {UUID} user_id
 * @param {UUID} brand_id
 */
async function scheduleEmailTrigger(flows, steps, origin, user_id, brand_id) {
  const campaigns = await createDraftCampaigns(flows, origin, user_id, brand_id)

  return Trigger.create(campaigns.map((campaign_id, i) => ({
    action: 'schedule_email',
    brand: flows[i].brand,
    created_by: steps[i].created_by,
    event_type: origin.event_type,
    user: steps[i].created_by,
    campaign: campaign_id,
    contact: flows[i].contact,
    flow: flows[i].id,
    flow_step: steps[i].id,
    wait_for: moment.duration(origin.wait_for).asSeconds(),
    time: origin.time,
  })))
}

/**
 * @param {import('../types').IStoredFlow[]} flows 
 * @param {import('../../Brand/flow_step/types').IStoredBrandFlowStep} origin 
 * @param {UUID} user_id
 * @param {UUID} brand_id
 */
async function createDraftCampaigns(flows, origin, user_id, brand_id) {
  /** @type {import('../types').IPopulatedFlow[]} */
  const populated_flows = await Orm.populate({
    models: flows,
    associations: ['flow.contact']
  })

  for (const flow of populated_flows) {
    if (!flow.contact.email) {
      // TODO: Flow should be considered as failed with appropriate error
      // Save the error and failed state in the flow record

      throw new TriggerError('Cannot schedule an email for a contact without any email addresses')

      // expect(contacts[i].email, 'Cannot schedule an email for a contact without any email addresses').not.be.null.and.not.be.undefined
    }
  }

  const htmlBodies = await getCampaignBody(origin, populated_flows, user_id, brand_id)

  /** @type {IEmailCampaignInput[]} */
  const campaigns = flows.map((flow, i) => {
    const campaign = {
      created_by: flow.created_by,
      brand: flow.brand,
      due_at: null,
      from: flow.created_by,
      subject: origin.title, // brand_email.subject,
      individual: true,
      to: [{
        contact: flow.contact,
        email: /** @type {string} */(populated_flows[i].contact.email),
        recipient_type: Email.EMAIL
      }],

      // only if we have a template_instance
      template: origin.template_instance,

      // only if we don't have a template_instance
      html: htmlBodies[i],
    }

    return campaign
  })

  return EmailCampaign.createMany(campaigns)
}

/**
 * @param {import('../../Brand/flow_step/types').IStoredBrandFlowStep} origin
 * @param {import('../types').IPopulatedFlow[]} flows
 * @param {UUID} user_id
 * @param {UUID} brand_id
 * @returns {Promise<string[]>}
 */
async function getCampaignBody(origin, flows, user_id, brand_id) {
  if (origin.template_instance) {
    return []
  }

  if (origin.email) {
    const body = await getHtmlFromBrandEmail(origin.email)
    return flows.map(() => body)
  }

  if (origin.template) {
    const brand_template = await BrandTemplate.get(origin.template)
    return getHtmlFromTemplate(flows, brand_template.template, user_id, brand_id)
  }

  throw new Error('A brand_flow_step object should have an email, or a template or a template_instance.')
}

/**
 * @param {UUID} brand_email_id 
 * @returns {Promise<string>}
 */
async function getHtmlFromBrandEmail(brand_email_id) {
  const brand_email = await BrandEmail.get(brand_email_id)
  return brand_email.body
}

/**
 * @param {import('../types').IPopulatedFlow[]} flows
 * @param {UUID} template_id 
 * @param {UUID} user_id
 * @param {UUID} brand_id
 * @returns {Promise<string[]>}
 */
async function getHtmlFromTemplate(flows, template_id, user_id, brand_id) {
  const template = await Template.get(template_id)
  const user = await User.get(user_id)

  const parent_ids = await Brand.getParents(brand_id)
  const parents = await Brand.getAll(parent_ids)

  let brokerage_brand
  for(const parent of parents) {
    if (parent.brand_type !== Brand.BROKERAGE)
      continue

    brokerage_brand = parent
    break
  }

  const html = (await promisify(AttachedFile.download)(template.file)).toString()

  if (!template.inputs.includes('contact')) {
    const rendered = await renderTemplate({
      html,
      template,
      brand: brokerage_brand,
      variables: {
        user,
      }
    })

    return flows.map(() => rendered)
  }

  return Promise.all(flows.map(flow => renderTemplate({
    html,
    template,
    brand: brokerage_brand,
    variables: {
      user,
      contact: flow.contact,
      // listing
    }
  })))
}

module.exports = {
  scheduleSteps,
}
