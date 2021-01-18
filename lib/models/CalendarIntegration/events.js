const Context = require('../Context')
const CrmTask = require('../CRM/Task/emitter')
const IntegrationWorkers = require('./workers/index')


async function handleEvent({ task_ids, reason }) {
  Context.log('**** CrmTask.on update/delete', task_ids, reason)

  IntegrationWorkers.resetEtagByCrmTask({ task_ids, reason })
}


module.exports = function attachEventHandlers() {
  CrmTask.on('update', handleEvent)
  CrmTask.on('delete', handleEvent)
}