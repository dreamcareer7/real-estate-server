const MicrosoftWorker = require('../../../lib/models/Microsoft/workers')
const { poll } = require('../poll')
require('./entrypoint')

poll({
  fn: MicrosoftWorker.Calendar.syncDue,
  name: 'MicrosoftWorker.calendar.syncDue',
  wait: 60000
})
