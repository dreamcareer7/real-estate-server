const config  = require('../../config')
const Context = require('../Context')
const CrmTask = require('../CRM/Task/index')

const CalendarIntegration = require('./index')

const _REASON = config.google_integration.crm_task_update_reason


async function onEvent({ task_ids, reason }) {
  if ( reason !== _REASON ) {
    Context.log('SyncGoogleCalendar CrmTask event-listener ==>', reason, task_ids)
    await CalendarIntegration.resetEtagByCrmTask(task_ids)
  }
}


module.exports = function attachEventHandlers() {
  CrmTask.on('update', onEvent)
  CrmTask.on('delete', onEvent)
}