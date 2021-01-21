const db = require('../../utils/db')
const { TriggerError } = require('../Trigger/error')
const Trigger = require('../Trigger/get')

const { get } = require('./get')
const BrandFlow = require('../Brand/flow/get')
const BrandFlowStep = require('../Brand/flow_step/get')

const FlowStep = {
  ...require('./step/create'),
  ...require('./step/get'),
  ...require('./step/schedule'),
  ...require('./step/update'),
}

/**
 * @param {UUID} brand_flow_id 
 * @param {UUID} brand_step_id 
 * @returns {Promise<import('../Brand/flow_step/types').IStoredBrandFlowStep | null>}
 */
async function getNextBrandStep(brand_flow_id, brand_step_id) {
  const brand_flow = await BrandFlow.get(brand_flow_id)
  // steps are always ordered by the "order" field
  const steps = await BrandFlowStep.getAll(brand_flow.steps)

  const idx = steps.findIndex(s => s.id === brand_step_id)

  if (idx < 0 || idx === steps.length - 1) return null

  return steps[idx + 1]
}

async function setLastExecutedAt(flow_id) {
  return db.update('flow/set_last_executed_at', [ flow_id ])
}

/**
 * @param {import('./types').IStoredFlow} flow 
 * @param {UUID} step_id 
 */
async function scheduleNextStep(flow, step_id) {
  const step = await FlowStep.get(step_id)
  const user_id = flow.created_by

  const next_brand_step = await getNextBrandStep(flow.origin, step.origin)
  if (!next_brand_step) return

  const [ next_step ] = await FlowStep.create([{
    flow: flow.id,
    origin: next_brand_step.id,
    created_by: user_id,
  }])

  try {
    await FlowStep.scheduleSteps([ next_step ], next_brand_step, user_id, flow.brand)
  } catch (ex) {
    await FlowStep.markAsFailed(next_step, ex.message)
    await scheduleNextStep(flow, next_step)
  }
}

/**
 * Marks the step as executed and schedules the next step
 * @param {UUID} flow_id 
 * @param {UUID} step_id 
 * @param {UUID} trigger_id
 */
async function markStepExecuted(flow_id, step_id, trigger_id) {
  const trigger = await Trigger.get(trigger_id)
  if (!trigger.executed_at) {
    throw new TriggerError(`Cannot mark flow step '${step_id}' as executed without an executed trigger '${trigger.id}'.`)
  }

  await setLastExecutedAt(flow_id)

  if (trigger.action === 'create_event') {
    await FlowStep.markAsExecuted(step_id, trigger.event, null)
  } else if (trigger.action === 'schedule_email') {
    await FlowStep.markAsExecuted(step_id, null, trigger.campaign)
  }

  const flow = await get(flow_id)
  await scheduleNextStep(flow, step_id)
}

/**
 * Marks the step as executed and schedules the next step
 * @param {UUID} flow_id 
 * @param {UUID} step_id 
 * @param {UUID} trigger_id
 */
async function markStepFailed(flow_id, step_id, trigger_id) {
  const trigger = await Trigger.get(trigger_id)
  if (!trigger.executed_at) {
    throw new TriggerError(`Cannot mark flow step '${step_id}' as executed without an executed trigger '${trigger.id}'.`)
  }

  await setLastExecutedAt(flow_id)

  if (trigger.action === 'create_event') {
    await FlowStep.markAsExecuted(step_id, trigger.event, null)
  } else if (trigger.action === 'schedule_email') {
    await FlowStep.markAsExecuted(step_id, null, trigger.campaign)
  }

  const flow = await get(flow_id)
  await scheduleNextStep(flow, step_id)
}

module.exports = {
  markStepExecuted
}
