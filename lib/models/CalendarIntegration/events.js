const CrmTask = require('../CRM/Task/emitter')
const IntegrationWorkers = require('./workers/index')


async function handleEvent({ task_ids, reason }) {
  if ( !task_ids || task_ids.length === 0 ) {
    return
  }

  IntegrationWorkers.resetEtagByCrmTask({ task_ids, reason })
}


module.exports = function attachEventHandlers() {
  CrmTask.on('update', handleEvent)
  CrmTask.on('delete', handleEvent)
}