const _ = require('lodash')
const sq = require('../../utils/squel_extensions')

const db = require('../../utils/db')
const Orm = require('../Orm')

const FlowEvent = require('./event')
const FlowEmail = require('./email')
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
    Context.log('Creating event steps')

    const event_brand_steps = brand_steps.filter(bs => bs.event)
    const ebs_ids = event_brand_steps.map(es => es.id)
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
      event_brand_steps.map(es => es.event),
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
   * @param {IBrandFlowStep[]} brand_steps 
   * @param {IFlowStepInput[]} steps 
   */
  async _createEmails(brand_id, user_id, epoch, brand_steps, steps) {
    Context.log('Creating email steps')

    const email_brand_steps = brand_steps.filter(bs => bs.email)
    const ebs_ids = email_brand_steps.map(es => es.id)
    const ebs_by_id = _.keyBy(email_brand_steps, 'id')
    const email_steps = steps.filter(s => ebs_ids.includes(s.origin))

    const emails = email_steps.map(/** @returns {IFlowEmailInput} */es => ({
      origin: ebs_by_id[es.origin].email,
      contact: es.contact,
      is_automated: ebs_by_id[es.origin].is_automated,
      due_date: epoch + ebs_by_id[es.origin].due_in,
      event_title: ebs_by_id[es.origin].title
    }))

    const email_ids = await FlowEmail.create(
      brand_id,
      user_id,
      email_brand_steps.map(es => es.email),
      emails
    )

    for (let i = 0; i < email_ids.length; i++) {
      email_steps[i].email = email_ids[i]
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
    Context.log(`Creating ${steps.length} steps`)

    const brand_steps = await BrandFlowStep.getAll(brand_step_ids)

    await this._createEvents(brand_id, user_id, epoch, brand_steps, steps)
    await this._createEmails(brand_id, user_id, epoch, brand_steps, steps)

    const data = steps.map(step => ({
      flow: step.flow,
      origin: step.origin,
      event: step.event,
      email: step.email,
      created_by: user_id
    }))

    const q = sq.insert({ autoQuoteFieldNames: true })
      .into('flows_steps')
      .setFieldsRows(data)
      .returning('id')

    q.name = 'flow/step/create'

    return db.selectIds(q, [])
  }
}

const Model = new FlowStep

Orm.register('flow_step', 'FlowStep', Model)

module.exports = Model
