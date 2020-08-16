const GoogleWorkers = require('../../../lib/models/Google/workers')
const { poll } = require('../poll')
require('./entrypoint')

poll({
  fn: GoogleWorkers.Calendar.syncDue,
  name: 'GoogleWorkers.calendar.syncDue',
  wait: 60000
})
