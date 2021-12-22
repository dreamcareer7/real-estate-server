const db   = require('../../utils/db')
const emitter  = require('./emitter')
const { get } = require('./get')
const Trigger = {
  ...require('../Trigger/get'),
  ...require('../Trigger/delete'),
}

/**
 * @param {UUID} flow_id 
 */
async function getTriggersForCurrentFlowSteps(flow_id) {
  const tids = await db.selectIds('flow/current_steps', [ flow_id ])
  return Trigger.getAll(tids)
}

/**
 * Stops a flow from moving forward. Removes all future events and scheduled emails.
 * @param {UUID} user_id 
 * @param {UUID} flow_id 
 */
async function stop(user_id, flow_id) {
  const flow = await get(flow_id)
  
  const triggers = await getTriggersForCurrentFlowSteps(flow_id)
  await Trigger.delete(triggers.map(t => t.id), user_id)
  
  await db.update('flow/delete', [
    flow_id,
    user_id
  ])

  emitter.emit('stop', { flow_id, user_id, brand_id: flow.brand, contact_id: flow.contact })
}

module.exports = {
  stop,
}
