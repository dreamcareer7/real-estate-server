const { get } = require('./get')

/**
 * @param {UUID} step_id 
 * @param {UUID | null} event 
 * @param {UUID | null} campaign 
 */
async function markAsExecuted(step_id, event, campaign) {
  const step = await get(step_id)


}

module.exports = {
  markAsExecuted,
}
