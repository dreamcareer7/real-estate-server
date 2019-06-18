const { EventEmitter } = require('events')

const _ = require('lodash')
const moment = require('moment-timezone')

const belt = require('../../utils/belt')
const db = require('../../utils/db')
const sq = require('../../utils/squel_extensions')

const BrandFlow = require('../Brand/flow')
const Context = require('../Context/index')
const Orm = require('../Orm')
const User = require('../User')

const FlowStep = require('./step')

class Flow extends EventEmitter {
  /**
   * @param {UUID[]} ids 
   * @returns {Promise<IFlow[]>}
   */
  async getAll(ids) {
    return db.select('flow/get', [ids])
  }

  /**
   * @param {UUID} id 
   */
  async get(id) {
    const flows = await this.getAll([id])

    if (flows.length < 1) {
      throw Error.ResourceNotFound(`Flow ${id} not found!`)
    }

    return flows[0]
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
    /**
     * Get brand flows
     * Apply a brand flow on a contact
     *  1. Create a flow with a brand_flow as origin
     *  2. Create crm_tasks and email_campaigns per each brand_flow_step
     *  3. Create flow_events and flow_emails per each brand_flow_step with links to created crm_task or email_campaign
     *  4. Create flow_steps per each brand_flow_step with links to the flow_events and flow_emails created above
     */

    Context.log(`Creating ${contact_ids.length} flows`)

    const data = contact_ids.map(contact => ({
      created_by: user_id,
      updated_by: user_id,
      brand: brand_id,
      origin: brand_flow.id,
      name: brand_flow.name,
      description: brand_flow.description || null,
      starts_at: belt.epochToDate(starts_at).toISOString(),
      contact
    }))

    const q = sq.insert({ autoQuoteFieldNames: true })
      .into('flows')
      .setFieldsRows(data)
      .returning('id')

    // @ts-ignore
    q.name = 'flow/create'
    return db.selectIds(q, [])
  }

  /**
   * @param {{ brand: UUID; origin?: UUID; contacts?: UUID[]; status?: 'Active' | 'Stopped' | 'Completed' }} arg1
   */
  async filter({brand, origin, contacts, status}) {
    const q = sq.select()
      .field('id')
      .from('flows')
      .where('brand = ?', brand)

    if (status === 'Stopped') {
      q.where('deleted_at IS NOT NULL')
    }
    else {
      q.where('deleted_at IS NULL')

      if (status === 'Active') {
        q.where('starts_at + (SELECT MAX(due_in) FROM brands_flow_steps WHERE flow = flows.origin) <= now()')
      }
      else {
        q.where('starts_at + (SELECT MAX(due_in) FROM brands_flow_steps WHERE flow = flows.origin) > now()')
      }
    }

    if (origin) q.where('origin = ?', origin)

    if (Array.isArray(contacts)) q.where('contact = ANY(?)', sq.SqArray.from(contacts))

    return db.selectIds(q)
  }

  /**
   * @param {UUID} brand_id 
   * @param {UUID} user_id 
   * @param {UUID[]} flow_ids
   * @param {number} starts_at 
   * @param {UUID[]} brand_steps brand_flow_step ids
   * @param {UUID[]} contact_ids contact ids to enroll
   */
  async _createSteps(
    brand_id,
    user_id,
    flow_ids,
    starts_at,
    brand_steps,
    contact_ids
  ) {
    const steps = contact_ids.flatMap((contact, i) => brand_steps.map(bs => ({
      flow: flow_ids[i],
      origin: bs,
      contact,
    })))

    const user = await User.get(user_id)

    await FlowStep.create(brand_id, user_id, moment.unix(starts_at).tz(user.timezone).startOf('day').unix(), brand_steps, steps)
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
    if (brand_steps.length < 1) {
      throw Error.Validation('Selected steps cannot be empty!')
    }

    if (contact_ids.length < 1) {
      throw Error.Validation('Contacts cannot be empty!')
    }

    const accessIndex = await BrandFlow.hasAccess(brand_id, 'read', [brand_flow_id])

    if (!accessIndex.get(brand_flow_id)) {
      throw Error.ResourceNotFound(`Flow template ${brand_flow_id} not found`)
    }

    const existing_flow_ids = await this.filter({
      brand: brand_id,
      origin: brand_flow_id,
      contacts: contact_ids,
      status: 'Active'
    })

    console.log(existing_flow_ids)

    const existing_flows = await this.getAll(existing_flow_ids)
    const contacts_to_enroll = _.difference(contact_ids, existing_flows.map(f => f.contact))

    if (contacts_to_enroll.length < 1) return []
  
    // TODO: Make sure all brand_steps belong to brand_flow_id
    const brand_flow = await BrandFlow.get(brand_flow_id)

    Context.log(`Enroll ${contacts_to_enroll.length} contacts to flow ${brand_flow.name}`)

    const flow_ids = await this.create(brand_id, user_id, brand_flow, starts_at, contacts_to_enroll)
    await this._createSteps(brand_id, user_id, flow_ids, starts_at, brand_steps, contacts_to_enroll)

    return this.getAll(flow_ids)
  }

  /**
   * Stops a flow from moving forward. Removes all future events and scheduled emails.
   * @param {UUID} user_id 
   * @param {UUID} flow_id 
   */
  async stop(user_id, flow_id) {
    const flow = await this.get(flow_id)

    const remaining_steps = await db.select('flow/remaining_steps', [
      flow_id
    ])

    await this.disableSteps(user_id, flow_id, remaining_steps.map(rs => rs.origin))

    await db.update('flow/delete', [
      flow_id,
      user_id
    ])

    this.emit('stop', { flow_id, user_id, brand_id: flow.brand })
  }

  /**
   * Enables a set of steps from the flow template
   * @param {UUID} user_id
   * @param {UUID} flow_id
   * @param {UUID[]} brand_steps
   */
  async enableSteps(user_id, flow_id, brand_steps) {
    const flow = await this.get(flow_id)
    const steps = await FlowStep.getAll(flow.steps)

    // Skip existing steps
    const existing_brand_steps = steps.map(s => s.origin)

    await this._createSteps(
      flow.brand,
      user_id,
      [flow.id],
      flow.starts_at,
      brand_steps.filter(bs => !existing_brand_steps.includes(bs)),
      [flow.contact]
    )
  }

  /**
   * Disables a set of steps from the flow template
   * @param {UUID} user_id
   * @param {UUID} flow_id
   * @param {UUID[]} brand_steps
   */
  async disableSteps(user_id, flow_id, brand_steps) {
    const flow = await this.get(flow_id)
    const steps = await FlowStep.getAll(flow.steps)

    // Skip non-existing steps
    const existing_steps = steps.filter(s => brand_steps.includes(s.origin)).map(s => s.id)

    await FlowStep.delete(existing_steps, user_id, flow.brand)
  }
}

Flow.prototype.associations = {
  origin: {
    model: 'BrandFlow',
    enabled: false,
    collection: false,
    optional: true
  },
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
