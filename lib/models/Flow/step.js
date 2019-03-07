const _ = require('lodash')
const sq = require('@rechat/squel').useFlavour('postgres')

const db = require('../../utils/db')
const Orm = require('../Orm')

const FlowEvent = require('./event')
const BrandFlowStep = require('../Brand/flow_step')

class FlowStep {
  /**
   * @param {UUID} brand_id 
   * @param {UUID} user_id 
   * @param {number} epoch 
   * @param {IBrandFlowStep[]} brand_steps 
   * @param {IFlowStepInput[]} steps 
   */
  async _createEvents(brand_id, user_id, epoch, brand_steps, steps) {
    const event_brand_steps = brand_steps.filter(bs => bs.event)
    const ebs_ids = event_brand_steps.map(es => es.event)
    const ebs_by_id = _.keyBy(event_brand_steps, 'id')

    const event_steps = steps.filter(s => ebs_ids.includes(s.origin))

    const events = event_steps.map(/** @returns {IFlowEventInput} */es => ({
      origin: ebs_by_id[es.origin].event,
      contact: es.contact,
      due_date: epoch + ebs_by_id[es.origin].due_in
    }))

    const event_ids = await FlowEvent.create(
      brand_id,
      user_id,
      ebs_ids,
      events
    )

    for (let i = 0; i < event_ids.length; i++) {
      event_steps[i].event = event_ids[i]
    }
  }

  /**
   * @param {UUID} brand_id 
   * @param {UUID} user_id 
   * @param {number} epoch 
   * @param {UUID[]} brand_step_ids 
   * @param {IFlowStepInput[]} steps 
   */
  async create(brand_id, user_id, epoch, brand_step_ids, steps) {
    const brand_steps = await BrandFlowStep.getAll(brand_step_ids)

    await this._createEvents(brand_id, user_id, epoch, brand_steps, steps)

    const data = steps.map(step => ({
      flow: step.flow,
      origin: step.origin,
      event: step.event,
      created_by: user_id
    }))

    return db.selectIds(
      sq.insert({ autoQuoteFieldNames: true })
        .into('flow_steps')
        .setFieldsRows(data)
        .returning('id')
    )
  }
}

const Model = new FlowStep

Orm.register('flow_step', 'FlowStep', Model)

module.exports = Model
