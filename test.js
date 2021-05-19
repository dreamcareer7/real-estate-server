const TaskWorker = require('./lib/models/CRM/Task/worker/notification.js');
const { runInContext } = require('./lib/models/Context/util')

async function main() {
  await TaskWorker.renderSingleNotification('c8a58170-3988-11eb-8f80-027d31a1f7a0')
  setTimeout(() => {}, 2000)
}

runInContext('RenderReminderTemplate', main).catch(ex => {
  console.error(ex)
}).finally(() => process.exit())
