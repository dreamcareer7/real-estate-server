const sq = require('@rechat/squel').useFlavour('postgres')

const db = require('../../utils/db')
const Orm = require('../Orm')
const BrandFlow = require('../Brand/flow')

const FlowStep = require('./step')

/*

* Get brand flows
* Apply a brand flow on a contact
  1. Create a flow with a brand_flow as origin
  2. Create crm_tasks and email_campaigns per each brand_flow_step
  3. Create flow_events and flow_emails per each brand_flow_step with links to created crm_task or email_campaign
  4. Create flow_steps per each brand_flow_step with links to the flow_events and flow_emails created above

  */

class Flow {
  /**
   * @param {UUID[]} ids 
   */
  async getAll(ids) {
    return db.query.promise('flow/get', [ids])
  }

  /**
   * Creates a flow instance per each contact id
   * @param {UUID} brand_id 
   * @param {UUID} user_id 
   * @param {IBrandFlow} brand_flow 
   * @param {number} starts_at 
   * @param {UUID[]} contact_ids 
   */
  async create(brand_id, user_id, brand_flow, starts_at, contact_ids) {
    const data = contact_ids.map(contact => ({
      created_by: user_id,
      brand: brand_id,
      origin: brand_flow.id,
      name: brand_flow.name,
      description: brand_flow.description,
      starts_at,
      contact
    }))

    return db.selectIds(
      sq.insert({ autoQuoteFieldNames: true })
        .into('flows')
        .setFieldsRows(data)
        .returning('id'),
      []
    )
  }

  /**
   * @param {UUID} brand_id 
   * @param {UUID} user_id 
   * @param {UUID} brand_flow_id template flow id
   * @param {number} starts_at 
   * @param {UUID[]} brand_steps brand_flow_step ids
   * @param {UUID[]} contact_ids contact ids to enroll
   */
  async enrollContacts(brand_id, user_id, brand_flow_id, starts_at, brand_steps, contact_ids) {
    // TODO: Make sure all brand_steps belong to brand_flow_id
    const brand_flow = await BrandFlow.get(brand_flow_id)

    const flow_ids = await this.create(brand_id, user_id, brand_flow, starts_at, contact_ids)
    const steps = contact_ids.flatMap((contact, i) => brand_steps.map(bs => ({
      flow: flow_ids[i],
      origin: bs,
      contact,
    })))

    await FlowStep.create(brand_id, user_id, starts_at, brand_steps, steps)
  }
}

Flow.prototype.associations = {
  steps: {
    model: 'FlowStep',
    enabled: true,
    collection: true,
    optional: false
  }
}

const Model = new Flow()

Orm.register('flow', 'Flow', Model)

module.exports = Model
