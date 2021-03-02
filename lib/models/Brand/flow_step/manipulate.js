const db = require('../../../utils/db')
const Context = require('../../Context')

const BrandEvent = require('../event')
const { get, getAll } = require('./get')


/**
 * @param {UUID} user_id 
 * @param {UUID} step_id
 * @param {import('./types').IBrandFlowStepInput} step 
 */
const update = async (user_id, step_id, step) => {
  const existing = await get(step_id)

  if (existing.event) {
    if (step.email) throw Error.Validation('BrandFlowStep cannot have both event and email templates')

    if (step.event) await BrandEvent.update(user_id, existing.event, step.event)
  }

  await db.update('brand/flow/step/update_flow_step_orders', [
    step.flow,
    step.order
  ])

  return db.update('brand/flow/step/update', [
    /**  $1 */ user_id,
    /**  $2 */ Context.getId(),
    /**  $3 */ step_id,
    /**  $4 */ step.title ?? existing.title,
    /**  $5 */ step.description ?? existing.description,
    /**  $6 */ step.order ?? existing.order,
    /**  $7 */ step.event_type ?? existing.event_type,
    /**  $8 */ step.wait_for ? (Object.entries(step.wait_for).map(([unit, value]) => `${value} ${unit}`).join(' ')) : existing.wait_for,
    /**  $9 */ step.time ?? existing.time,
    /** $10 */ step.email ?? existing.email,
    /** $11 */ step.template ?? existing.template,
    /** $12 */ step.template_instance ?? existing.template_instance,
    /** $13 */ typeof existing.email === 'string'
  ])
}

/**
 * @param {UUID} user_id 
 * @param {UUID} flow_id
 * @param {UUID} step_id
 */
const deleteOne = async (user_id, flow_id, step_id) => {
  const existing = await get(step_id)

  if (existing.flow !== flow_id) {
    console.log(existing)
    console.log(`${existing.flow} !== ${flow_id}`)
    throw Error.Forbidden(`Access forbidden to brand flow step ${step_id}`)
  }

  if (existing.event) {
    await BrandEvent.delete(user_id, [existing.event])
  }

  return db.update('brand/flow/step/delete', [
    user_id,
    Context.getId(),
    [step_id],
  ])
}

/**
 * @param {UUID} user_id 
 * @param {UUID} flow_id 
 * @param {UUID[]} steps 
 */
const deleteMany = async (user_id, flow_id, steps) => {
  const existings = await getAll(steps)

  for (const step of existings) {
    if (step.flow !== flow_id) {
      console.log(step)
      console.log(`${step.flow} !== ${flow_id}`)
      throw Error.Forbidden(`Access forbidden to brand flow step ${step.id}`)
    }
  }

  await BrandEvent.delete(user_id, existings.filter(s => s.event).map(s => s.event))

  return db.update('brand/flow/step/delete', [
    user_id,
    Context.getId(),
    steps,
  ])
}


module.exports = {
  update,
  delete: deleteOne,
  deleteMany,
}
