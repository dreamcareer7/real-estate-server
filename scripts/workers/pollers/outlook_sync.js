const MicrosoftWorker = require('../../../lib/models/Microsoft/workers')
const { poll } = require('../poll')
require('./entrypoint')

poll({
  fn: MicrosoftWorker.Outlook.syncDue,
  name: 'MicrosoftWorker.outlook.syncDue',
  wait: 60000
})
