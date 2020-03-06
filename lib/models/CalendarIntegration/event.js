const config  = require('../../config')
const Context = require('../Context')
const CrmTask = require('../CRM/Task/index')

const CalendarIntegration = require('./index')

const _REASON = config.google_integration.crm_task_update_reason


async function onUpdateEvent({ task_ids, reason }) {
  if ( reason !== _REASON ) {
    Context.log('SyncGoogleCalendar CrmTask update-event-listener ==>', reason, task_ids)
    await CalendarIntegration.resetEtagByCrmTask(task_ids)
  }
}

async function onDeleteEvent({ task_ids, reason }) {
  if ( reason !== _REASON ) {
    Context.log('SyncGoogleCalendar CrmTask delete-event-listener ==>', reason, task_ids)
    await CalendarIntegration.resetEtagByCrmTask(task_ids)

    // delete calendar_integration record
    // deleet google_calendar_events record
  }
}


module.exports = function attachEventHandlers() {
  CrmTask.on('update', onUpdateEvent)
  CrmTask.on('delete', onDeleteEvent)
}