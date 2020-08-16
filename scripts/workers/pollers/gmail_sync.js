const GoogleWorkers = require('../../../lib/models/Google/workers')
const { poll } = require('../poll')
require('./entrypoint')

poll({
  fn: GoogleWorkers.Gmail.syncDue,
  name: 'GoogleWorkers.gmail.syncDue',
  wait: 60000
})
