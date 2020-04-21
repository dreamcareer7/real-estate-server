const config  = require('../../config')
const Context = require('../Context')
const CrmTask = require('../CRM/Task/index')

const CalendarIntegration = require('./index')

const G_REASON = config.google_integration.crm_task_update_reason
const M_REASON = config.microsoft_integration.crm_task_update_reason


async function handleEvent({ task_ids, reason }) {
  if ( reason !== G_REASON && reason !== M_REASON ) {
    Context.log('SyncGoogleCalendar CrmTask event-listener ==>', reason, task_ids)
    await CalendarIntegration.resetEtagByCrmTask(task_ids)
  }
}


module.exports = function attachEventHandlers() {
  CrmTask.on('update', handleEvent)
  CrmTask.on('delete', handleEvent)
}