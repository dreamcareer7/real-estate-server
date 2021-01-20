const db = require('../../../utils/db')
const Context = require('../../Context/index')

/**
 * @param {UUID} step_id 
 * @param {UUID | null} event 
 * @param {UUID | null} campaign 
 */
async function markAsExecuted(step_id, event, campaign) {
  return db.update('flow/step/mark_executed', [ step_id, event, campaign ])
}

/**
 * @param {UUID} step_id 
 * @param {string} failure 
 */
async function markAsFailed(step_id, failure) {
  return db.update('flow/step/mark_failed', [ step_id, failure, Context.getId() ])
}

module.exports = {
  markAsExecuted,
  markAsFailed
}
