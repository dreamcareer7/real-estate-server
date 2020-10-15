const db = require('../../utils/db')
const Context = require('../Context/index')

/**
 * @param {import('./trigger').ITriggerInput} trigger 
 */
async function create(trigger) {
  return db.insert('trigger/create', [
    Context.getId(),

    trigger.created_by,
    trigger.user,
    trigger.brand,

    trigger.event_type,
    trigger.wait_for,
    trigger.action,
    trigger.recurring || false,

    trigger.contact,
    trigger.deal,

    trigger.flow,
    trigger.flow_step,

    trigger.brand_event,
    trigger.campaign
  ])
}

module.exports = {
  create,
}
