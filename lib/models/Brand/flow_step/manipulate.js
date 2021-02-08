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

  return db.update('brand/flow/step/update', [
    /**  $1 */ user_id,
    /**  $2 */ Context.getId(),
    /**  $3 */ step_id,
    /**  $4 */ step.title,
    /**  $5 */ step.description,
    /**  $6 */ step.order,
    /**  $7 */ Object.entries(step.wait_for).map(([unit, value]) => `${value} ${unit}`).join(' '),
    /**  $8 */ step.time,
    /**  $9 */ step.email,
    /** $10 */ step.template,
    /** $11 */ step.template_instance,
    /** $12 */ typeof existing.email === 'string'
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
