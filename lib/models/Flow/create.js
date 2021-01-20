const belt = require('../../utils/belt')
const db = require('../../utils/db')
const sq = require('../../utils/squel_extensions')

const Context = require('../Context/index')

/**
 * Creates a flow instance per each contact id
 * @param {UUID} brand_id 
 * @param {UUID} user_id 
 * @param {IBrandFlow} brand_flow 
 * @param {number} starts_at 
 * @param {UUID[]} contact_ids 
 */
const create = async (brand_id, user_id, brand_flow, starts_at, contact_ids) => {
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

module.exports = {
  create,
}
