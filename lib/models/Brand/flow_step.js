const db = require('../../utils/db')
const Context = require('../Context')
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
   * @param {UUID} id 
   */
  async get(id) {
    const res = await this.getAll([id])

    if (res.length < 1) {
      throw Error.ResourceNotFound(`BrandFlowStep ${id} does not exist.`)
    }

    return res[0]
  }

  /**
   * @param {UUID} user_id
   * @param {UUID} brand_id
   * @param {Array<IBrandFlowStepInput & { flow: UUID }>} steps 
   */
  async _createEventSteps(user_id, brand_id, steps) {
    const event_steps = steps.filter(/** @type {TIsRequirePropPresent<IBrandFlowStepInput & { flow: UUID }, 'event'>} */ (s => Boolean(s.event)))
    const event_ids = await BrandEvent.createAll(user_id, brand_id, event_steps.map(s => s.event))

    for (let i = 0; i < event_ids.length; i++) {
      event_steps[i].event_id = event_ids[i]
      delete event_steps[i].event
    }
  }

  /**
   * @param {UUID} user_id
   * @param {UUID} brand_id
   * @param {Array<IBrandFlowStepInput & { flow: UUID }>} steps 
   */
  async createAll(user_id, brand_id, steps) {
    await this._createEventSteps(user_id, brand_id, steps)

    return db.selectIds('brand/flow/step/create', [
      user_id,
      JSON.stringify(steps),
      Context.getId()
    ])
  }

  /**
   * @param {UUID} user_id 
   * @param {UUID} step_id
   * @param {IBrandFlowStepInput} step 
   */
  async update(user_id, step_id, step) {
    const existing = await this.get(step_id)

    if (existing.event) {
      if (step.email) throw Error.Validation('BrandFlowStep cannot have both event and email templates')

      if (step.event) await BrandEvent.update(user_id, existing.event, step.event)
    }

    return db.update('brand/flow/step/update', [
      user_id,
      Context.getId(),
      step_id,
      step.title,
      step.description,
      step.due_in,
      step.email,
      typeof existing.email === 'string'
    ])
  }

  /**
   * @param {UUID} user_id 
   * @param {UUID} flow_id
   * @param {UUID} step_id
   */
  async delete(user_id, flow_id, step_id) {
    const existing = await this.get(step_id)

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
  async deleteMany(user_id, flow_id, steps) {
    const existings = await this.getAll(steps)

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
}

BrandFlowStep.prototype.associations = {
  event: {
    model: 'BrandEvent',
    enabled: false,
    collection: false,
    optional: true
  },

  email: {
    model: 'BrandEmail',
    enabled: false,
    collection: false,
    optional: true
  }
}

const Model = new BrandFlowStep()

Orm.register('brand_flow_step', 'BrandFlowStep', Model)

module.exports = Model
