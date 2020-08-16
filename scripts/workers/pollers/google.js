const GoogleWorkers = require('../../../lib/models/Google/workers')
const { poll } = require('../poll')
require('./entrypoint')

poll({
  fn: GoogleWorkers.Calendar.syncDue,
  name: 'GoogleWorkers.calendar.syncDue',
  wait: 60000
})

poll({
  fn: GoogleWorkers.Contacts.syncDue,
  name: 'GoogleWorkers.contacts.syncDue',
  wait: 60000
})

poll({
  fn: GoogleWorkers.Gmail.syncDue,
  name: 'GoogleWorkers.gmail.syncDue',
  wait: 60000
})
