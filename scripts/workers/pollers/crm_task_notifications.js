const CrmTaskWorker = require('../../../lib/models/CRM/Task/worker/notification')
const { poll } = require('../poll')
require('./entrypoint')

poll({
  fn: CrmTaskWorker.sendNotifications.bind(CrmTaskWorker),
  name: 'CrmTaskWorker.sendNotifications'
})
