const _ = require('lodash')

const BrandFlow = {
  ...require('../Brand/flow/get'),
  ...require('../Brand/flow/access'),
}
const BrandFlowStep = require('../Brand/flow_step/get')
const Context = require('../Context')
const FlowStep = require('./step/create')

const { filter } = require('./filter')
const { getAll } = require('./get')
const { create } = require('./create')
const workers = require('./worker')
const emitter = require('./emitter')

/**
 * @param {UUID} brand_id
 * @param {UUID} user_id
 * @param {UUID} brand_flow_id template flow id
 * @param {number} starts_at
 * @param {UUID[]} brand_step_ids brand_flow_step ids
 * @param {UUID[]} contact_ids contact ids to enroll
 */
const enrollContacts = async (brand_id, user_id, brand_flow_id, starts_at, brand_step_ids, contact_ids) => {
  if (brand_step_ids.length < 1) {
    throw Error.Validation('Selected steps cannot be empty!')
  }

  if (contact_ids.length < 1) {
    throw Error.Validation('Contacts cannot be empty!')
  }

  const accessIndex = await BrandFlow.hasAccess(brand_id, 'read', [brand_flow_id])

  if (!accessIndex.get(brand_flow_id)) {
    throw Error.ResourceNotFound(`Flow template ${brand_flow_id} not found`)
  }

  const brand_steps = (await BrandFlowStep.getAll(brand_step_ids)).sort((s1, s2) => s1.order - s2.order)

  const existing_flow_ids = await filter({
    brand: brand_id,
    origin: brand_flow_id,
    contacts: contact_ids,
    status: 'Active'
  })

  const existing_flows = await getAll(existing_flow_ids)
  const contacts_to_enroll = _.difference(contact_ids, existing_flows.map(f => f.contact))

  if (contacts_to_enroll.length < 1) return []

  // TODO: Make sure all brand_steps belong to brand_flow_id
  const brand_flow = await BrandFlow.get(brand_flow_id)

  Context.log(`Enroll ${contacts_to_enroll.length} contacts to flow ${brand_flow.name}`)

  const flow_ids = await create(brand_id, user_id, brand_flow, starts_at, contacts_to_enroll)

  /**
   * first steps for each flow
   * @type {import('./step/types').IFlowStepInput[]}
   **/
  const steps = contacts_to_enroll.map((_c, i) => ({
    flow: flow_ids[i],
    origin: brand_steps[0].id,
    created_by: user_id,
  }))

  const step_ids = await FlowStep.create(steps)
  workers.scheduleSteps(step_ids, brand_steps[0], user_id, brand_id)

  emitter.emit('create', { flow_ids, contacts: contacts_to_enroll, user_id, brand_id })

  return getAll(flow_ids)
}

module.exports = {
  enrollContacts
}
