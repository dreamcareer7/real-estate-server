const db = require('../../utils/db.js')
const Context = require('../Context')



/**
 * @param {UUID[]} crm_tasks
 * @param {String} origin source of change
 */
const resetEtagByCrmTask = async function (crm_tasks, origin) {
  Context.log('resetEtagByCrmTask', crm_tasks, origin)

  // reset local_etag of all records with same crm_task id
  if ( origin === 'rechat' ) {
    return await db.select('calendar_integration/reset_etag_by_crm_task', [crm_tasks])
  }

  return await db.select('calendar_integration/reset_etag_by_crm_task_and_origin', [crm_tasks, origin])
}



module.exports = {
  resetEtagByCrmTask
}