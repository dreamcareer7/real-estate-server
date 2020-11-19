const db = require('../../utils/db')
const Context = require('../Context/index')

/**
 * @param {UUID} id
 * @param {import('./trigger').ITriggerUpdateInput} data
 */
async function update(id, data) {
  return db.update('trigger/update', [
    id,
    Context.getId(),

    data.user,

    data.event_type,
    data.wait_for,
    data.time,
    data.recurring || false,

    data.brand_event,
    data.campaign
  ])
}

module.exports = {
  update,
}
