const db = require('../../utils/db')
const Orm = require('../Orm')

const BrandEvent = require('./event')

class BrandFlowStep {
  /**
   * @param {UUID[]} ids 
   * @returns {Promise<IBrandFlowStep[]>}
   */
  async getAll(ids) {
    return db.select('brand/flow/step/get', [ids])
  }

  /**
   * @param {UUID} user_id
   * @param {UUID} brand_id
   * @param {Array<IBrandFlowStepInput & { flow: UUID }>} steps 
   */
  async createAll(user_id, brand_id, steps) {
    const event_steps = steps.filter(/** @type {TIsRequirePropPresent<IBrandFlowStepInput & { flow: UUID }, 'event'>} */ (s => Boolean(s.event)))
    const event_ids = await BrandEvent.createAll(user_id, brand_id, event_steps.map(s => s.event))

    for (let i = 0; i < event_ids.length; i++) {
      event_steps[i].event_id = event_ids[i]
      delete event_steps[i].event
    }

    return db.selectIds('brand/flow/step/create', [
      user_id,
      JSON.stringify(steps)
    ])
  }
}

BrandFlowStep.prototype.associations = {
  event: {
    model: 'BrandEvent',
    enabled: false,
    collection: false,
    optional: true
  }
}

const Model = new BrandFlowStep()

Orm.register('brand_flow_step', 'BrandFlowStep', Model)

module.exports = Model
