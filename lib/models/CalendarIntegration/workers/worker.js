const config  = require('../../../config')
const Context = require('../../Context')

const G_REASON = config.google_integration.crm_task_update_reason
const M_REASON = config.microsoft_integration.crm_task_update_reason

const { resetEtagByCrmTask } = require('../update')



const resetEtag = async ({ task_ids, reason }) => {
  Context.log('SyncCalendars-CrmTask resetEtag', reason, task_ids)

  if ( reason !== G_REASON && reason !== M_REASON ) {
    Context.log('SyncCalendars-CrmTask event-listener (Source:Rechat) ==>', reason, task_ids)
    await resetEtagByCrmTask(task_ids, 'rechat')
  }

  if ( reason === G_REASON ) {
    Context.log('SyncCalendars-CrmTask event-listener (Source:Google) ==>', reason, task_ids)
    await resetEtagByCrmTask(task_ids, 'google')
  }

  if ( reason === M_REASON ) {
    Context.log('SyncCalendars-CrmTask event-listener (Source:Microsoft) ==>', reason, task_ids)
    await resetEtagByCrmTask(task_ids, 'microsoft')
  }
}

module.exports = {
  resetEtag
}