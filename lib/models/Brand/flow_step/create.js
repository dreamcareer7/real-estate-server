const db = require('../../../utils/db')
const Context = require('../../Context')

const BrandEvent = require('../event')

/**
 * @param {UUID} user_id
 * @param {UUID} brand_id
 * @param {Array<import('./types').IBrandFlowStepInput & { flow: UUID }>} steps 
 */
const createAll = async (user_id, brand_id, steps) => {
  await _createEventSteps(user_id, brand_id, steps)

  return db.selectIds('brand/flow/step/create', [
    user_id,
    JSON.stringify(steps),
    Context.getId()
  ])
}

/**
 * @param {UUID} user_id
 * @param {UUID} brand_id
 * @param {Array<import('./types').IBrandFlowStepInput & { flow: UUID }>} steps 
 */
const _createEventSteps = async (user_id, brand_id, steps) => {
  const event_steps = steps.filter(/** @type {TIsRequirePropPresent<import('./types').IBrandFlowStepInput & { flow: UUID }, 'event'>} */ (s => Boolean(s.event)))
  const event_ids = await BrandEvent.createAll(user_id, brand_id, event_steps.map(s => s.event))

  for (let i = 0; i < event_ids.length; i++) {
    event_steps[i].event_id = event_ids[i]
    delete event_steps[i].event
  }
}

module.exports = {
  createAll,
}
