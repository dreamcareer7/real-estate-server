const MicrosoftWorker = require('../../../lib/models/Microsoft/workers')
const { poll } = require('../poll')
require('./entrypoint')

poll({
  fn: MicrosoftWorker.Contacts.syncDue,
  name: 'MicrosoftWorker.contacts.syncDue',
  wait: 60000
})
