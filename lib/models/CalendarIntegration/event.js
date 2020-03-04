const Context = require('../Context')
const CrmTask = require('../CRM/Task/index')

const CalendarIntegration = require('./index')


async function onEvent({ task_ids }) {
  Context.log('SyncGoogleCalendar CrmTask event-listener ==>', task_ids)
  await CalendarIntegration.resetEtagByCrmTask(task_ids)
}


module.exports = function attachEventHandlers() {
  CrmTask.on('update', onEvent)
  CrmTask.on('delete', onEvent)
}