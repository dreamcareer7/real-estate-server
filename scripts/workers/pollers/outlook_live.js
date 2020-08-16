const MicrosoftWorker = require('../../../lib/models/Microsoft/workers')
const { poll } = require('../poll')
require('./entrypoint')

poll({
  fn: MicrosoftWorker.Outlook.parseNotifications,
  name: 'MicrosoftWorker.Outlook.parseNotifications',
  wait: 5000
})
