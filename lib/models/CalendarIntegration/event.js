const config  = require('../../config')
const CrmTask = require('../CRM/Task/index')
// const Context = require('../Context')

const CalendarIntegration = require('./index')

const G_REASON = config.google_integration.crm_task_update_reason
const M_REASON = config.microsoft_integration.crm_task_update_reason


async function handleEvent({ task_ids, reason }) {
  if ( reason !== G_REASON && reason !== M_REASON ) {
    // Context.log('SyncCalendars CrmTask event-listener (Source:Rechat) ==>', reason, task_ids)
    await CalendarIntegration.resetEtagByCrmTask(task_ids, 'rechat')
  }

  if ( reason === G_REASON ) {
    // Context.log('SyncCalendars CrmTask event-listener (Source:Google) ==>', reason, task_ids)
    await CalendarIntegration.resetEtagByCrmTask(task_ids, 'google')
  }

  if ( reason === M_REASON ) {
    // Context.log('SyncCalendars CrmTask event-listener (Source:Microsoft) ==>', reason, task_ids)
    await CalendarIntegration.resetEtagByCrmTask(task_ids, 'microsoft')
  }

  return
}


module.exports = function attachEventHandlers() {
  CrmTask.on('update', handleEvent)
  CrmTask.on('delete', handleEvent)
}