const CrmTask = require('../CRM/Task/emitter')
const IntegrationWorkers = require('./workers/index')


async function handleEvent({ task_ids, reason }) {
  IntegrationWorkers.resetEtagByContact({ task_ids, reason })
}


module.exports = function attachEventHandlers() {
  CrmTask.on('update', handleEvent)
  CrmTask.on('delete', handleEvent)
}