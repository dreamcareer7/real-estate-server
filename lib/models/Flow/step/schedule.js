const { strict: assert } = require('assert')
const moment = require('moment')
const zip = require('lodash/zip')

const BrandEmail = require('../../Brand/email/get')
const EmailCampaign = require('../../Email/campaign/create')
const Trigger = {
  ...require('../../Trigger/get'),
  ...require('../../Trigger/create'),
  ...require('../../Trigger/delete'),
}
const BrandTemplate = require('../../Template/brand/get')
const Email = require('../../Email/constants')
const Orm = require('../../Orm/index')
const Contact = require('../../Contact/render-template')

const Flow = require('../get')
const FlowStep = {
  ...require('./get'),
  ...require('./update'),
}

/** @typedef {import('./types').IStoredFlowStep} IStoredFlowStep */
/** @typedef {import('./types').IFailedStep} IFailedStep */
/** @typedef {import('./types').IFailedFlow} IFailedFlow */
/** @typedef {import('../types').IStoredFlow} IStoredFlow */
/** @typedef {import('../../Trigger/trigger').IStoredTrigger} IStoredTrigger */
/** @typedef {import('../types').IPopulatedFlow} IPopulatedFlow */
/** @typedef {import('../../Trigger/trigger').ITriggerInput} ITriggerInput */

/**
 * @param {IFailedFlow[]} flowFailures
 * @param {Pick<IStoredFlowStep, 'id' | 'flow'>[]} steps
 * @returns {IFailedStep[]}
 */
function toStepFailures (flowFailures, steps) {
  return flowFailures.map(ff => {
    const step = steps.find(s => s.flow === ff.id)
    assert(step, `No step object found having flow=${ff.id}`)

    return { id: step.id, message: ff.message }
  })  
}

/**
 * @param {IFailedStep[]} failures
 * @param {IStoredFlowStep[]} steps
 * @param {IStoredFlow[]} flows
 * @returns {[IStoredFlowStep[], IStoredFlow[]]}
 */
function adaptWithFailures (failures, steps, flows) {
  if (failures?.length) {
    steps = steps.filter(s => failures.every(fs => fs.id !== s.id))
    flows = flows.filter(f => steps.some(s => s.flow === f.id))
  }

  return [steps, flows]
}

/**
 * @param {object} options
 * @param {IStoredFlow[]} options.flows
 * @param {IStoredFlowStep[]} options.steps
 * @param {IContactAttribute['attribute_type']} options.eventType
 * @param {IUser['id']} options.userId
 * @returns {Promise<IFailedStep[]>}
 */
async function deleteActiveTriggers ({ flows, steps, eventType, userId }) {
  // This function has two purposes:
  // 1) deleting triggers having the same eventType
  //    but with less priority (non-flow triggers)
  // 2) returning "conflicts" as failures: cases having a similar flow trigger.
  //    in these cases we don't override.
  // EXCEPTION: we don't consider triggers with eventType='last_step_date' as conflicts
  //    because these triggers are not necessarily duplicates.
  
  // excluding last_step_date triggers
  if (eventType === 'last_step_date') { return [] }
  const triggers = await Trigger.getActiveContactTriggers({
    contactIds: flows.map(f => f.contact),
    eventTypes: [eventType],
  })
  if (!triggers?.length) { return [] }

  /** @type {Set<IStoredTrigger['id']>} */
  const idsToDelete = new Set(triggers.map(t => t.id))  

  /** @type {Set<IStoredFlow['id']>} */
  const knownFlows = new Set(flows.map(f => f.id))

  /** @type {IFailedStep[]} */
  const failures = []

  for (const t of triggers) {
    // we leave non-flow triggers in the idsToDelete set, in order to delete them later.
    if (!t.flow) { continue }

    // flow triggers are not for deleting
    idsToDelete.delete(t.id)

    // if it is in the same flow, it's not a conflict.
    // e.g. when a trigger step is executed and another step is scheduling.
    if (knownFlows.has(t.flow)) { continue }

    flows
      .filter(f => f.contact === t.contact)
      .map(f => steps.find(s => s.flow === f.id))
      .forEach(s => s && failures.push({
        id: s.id,
        message: 'Failed due to conflict with another flow',
      }))
  }

  await Trigger.delete([...idsToDelete], userId)
  return failures
}

/**
 * @param {UUID[]} step_ids flow step id
 * @param {import('../../Brand/flow_step/types').IStoredBrandFlowStep} origin
 * @param {UUID} user_id
 * @param {UUID} brand_id
 * @returns {Promise<IFailedStep[]>}
 */
async function scheduleSteps(step_ids, origin, user_id, brand_id) {
  let steps = await FlowStep.getAll(step_ids)
  let flows = await Flow.getAll(steps.map(s => s.flow))

  // failures are the cases when there already is another flow steps
  // scheduled for the same event
  const failures = await deleteActiveTriggers({
    steps,
    flows,
    eventType: origin.event_type,
    userId: user_id,
  })
  
  // filter the failure cases
  ;[steps, flows] = adaptWithFailures(failures, steps, flows)
  if (!steps.length || !flows.length) { return failures }

  if (origin.event) {
    await scheduleEventTrigger(flows, steps, origin, user_id, brand_id)
  } else {
    const sch = await scheduleEmailTrigger(flows, steps, origin, user_id, brand_id)
    failures.push(...sch.failures)
  }

  return failures
}

/**
 * @param {IFlow[]} flows
 * @param {IFlowStep[]} steps
 * @param {import('../../Brand/flow_step/types').IStoredBrandFlowStep} origin
 * @param {UUID} user_id
 * @param {UUID} brand_id
 */
async function scheduleEventTrigger(flows, steps, origin, user_id, brand_id) {
  const flowsMap = new Map(flows.map(f => [f.id, f]))
  
  return Trigger.create(steps.map(step => {
    const flow = flowsMap.get(step.flow)
    assert(flow, 'flow must be truthy')
    
    return {
      action: 'create_event',
      brand: brand_id,
      created_by: user_id,
      event_type: origin.event_type,
      user: user_id,
      brand_event: origin.event,
      contact: flow.contact,
      flow: flow.id,
      flow_step: step.id,
      wait_for: moment.duration(origin.wait_for).asSeconds(),
      time: origin.time,
      effective_at: new Date(flow.starts_at * 1000).toISOString(),
    }
  }))
}

/**
 * @param {IFlow[]} flows
 * @param {IFlowStep[]} steps
 * @param {import('../../Brand/flow_step/types').IStoredBrandFlowStep} origin
 * @param {UUID} user_id
 * @param {UUID} brand_id
 * 
 * @typedef {object} ScheduleEmailTriggerResult
 * @property {IStoredTrigger['id'][]} triggerIds
 * @property {IFailedStep[]} failures
 * @returns {Promise<ScheduleEmailTriggerResult>}
 */
async function scheduleEmailTrigger(flows, steps, origin, user_id, brand_id) {
  const {
    campaignIds,
    filteredFlows,
    failures: flowFailures,
  } = await createDraftCampaigns(flows, origin, user_id, brand_id)
  if (!campaignIds.length || !filteredFlows.length) {
    return {
      triggerIds: [],
      failures: toStepFailures(flowFailures, steps),
    }
  }
  
  /** @type {(_:[IPopulatedFlow | undefined, UUID | undefined]) => ITriggerInput} */
  function toTriggerInput ([flow, campaign]) {
    assert(flow && campaign, 'flow and campaign must be truthy')

    const step = steps.find(s => s.flow === flow.id)
    assert(step, `Step not found having flow=${flow.id}`)

    return {
      action: 'schedule_email',
      brand: flow.brand,
      created_by: step.created_by,
      event_type: origin.event_type,
      user: step.created_by,
      campaign,
      contact: flow.contact.id,
      flow: flow.id,
      flow_step: step.id,
      wait_for: moment.duration(origin.wait_for).asSeconds(),
      time: origin.time,
      effective_at: new Date(flow.starts_at * 1000).toISOString(),
    }
  }

  const triggerInputs = zip(filteredFlows, campaignIds).map(toTriggerInput)
  const triggerIds = await Trigger.create(triggerInputs)

  const failures = toStepFailures(flowFailures, steps)
  
  return { triggerIds, failures }
}

/**
 * @param {IFlow[]} flows 
 * @param {import('../../Brand/flow_step/types').IStoredBrandFlowStep} origin 
 * @param {UUID} user_id
 * @param {UUID} brand_id
 *
 * @typedef {object} CreateDraftCampaignsResult
 * @property {IEmailCampaignBase['id'][]} campaignIds
 * @property {IPopulatedFlow[]} filteredFlows
 * @property {IFailedFlow[]} failures
 *
 * @returns {Promise<CreateDraftCampaignsResult>}
 */
async function createDraftCampaigns(flows, origin, user_id, brand_id) {
  /** @type {IPopulatedFlow[]} */
  const populated_flows = await Orm.populate({
    models: flows,
    associations: ['flow.contact']
  })

  /** @type {IFailedFlow[]} */
  const failures = []
  
  const filteredFlows = populated_flows.filter(f => {
    if (f.contact.email) { return true }

    // TODO: Flow should be considered as failed with appropriate error
    // Save the error and failed state in the flow record
    failures.push({
      id: f.id,
      message: 'Cannot schedule an email for a contact without any email addresses'
    })
    
    return false
  })
  if (!filteredFlows.length) {
    return {
      campaignIds: [],
      filteredFlows: [],
      failures,
    }
  }

  const htmlBodies = await getCampaignBody(origin, filteredFlows, user_id, brand_id)
  assert(
    htmlBodies.length === 0 || htmlBodies.length === filteredFlows.length,
    'htmlBodies.length must be either zero or equal to filteredFlows.length'
  )

  const campaigns = zip(filteredFlows, htmlBodies).map(([flow, body]) => {
    assert(flow, 'flow must be truthy')
    
    return {
      created_by: flow.created_by,
      brand: flow.brand,
      due_at: null,
      from: flow.created_by,
      subject: origin.title, // brand_email.subject,
      individual: true,
      to: [{
        contact: flow.contact.id,
        email: /** @type {string} */(flow.contact.email),
        recipient_type: Email.EMAIL
      }],

      // only if we have a template_instance
      template: origin.template_instance,

      // only if we don't have a template_instance
      html: body,
    }
  })

  const campaignIds = await EmailCampaign.createMany(campaigns)
  return { campaignIds, filteredFlows, failures }
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
    return Contact.renderTemplate({
      templateId: brand_template.template,
      contacts: flows.map(f => f.contact),
      brandId: brand_id,
      userId: user_id,
    })
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

module.exports = {
  scheduleSteps,
}
