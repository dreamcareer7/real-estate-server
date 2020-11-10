const config = require('../../../config')

const G_REASON = config.google_integration.crm_task_update_reason
const M_REASON = config.microsoft_integration.crm_task_update_reason

const { resetEtagByCrmTask } = require('../update')



const resetEtag = async ({ task_ids, reason }) => {
  if ( reason !== G_REASON && reason !== M_REASON ) {
    await resetEtagByCrmTask(task_ids, 'rechat')
  }

  if ( reason === G_REASON ) {
    await resetEtagByCrmTask(task_ids, 'google')
  }

  if ( reason === M_REASON ) {
    await resetEtagByCrmTask(task_ids, 'microsoft')
  }
}

module.exports = {
  resetEtag
}