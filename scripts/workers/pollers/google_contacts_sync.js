const GoogleWorkers = require('../../../lib/models/Google/workers')
const { poll } = require('../poll')
require('./entrypoint')

poll({
  fn: GoogleWorkers.Contacts.syncDue,
  name: 'GoogleWorkers.contacts.syncDue',
  wait: 60000
})
